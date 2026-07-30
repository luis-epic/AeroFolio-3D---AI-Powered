import { GoogleGenAI } from "@google/genai"
import { MOCK_PROJECTS } from "../constants"

/**
 * Serverless chat endpoint.
 *
 * SECURITY: The Gemini API key is read from the server-side environment only.
 * It is never sent to the browser and never inlined into the client bundle.
 */

const MODEL_ID = "gemini-3-flash-preview"
const MAX_PROMPT_LENGTH = 1000

// ---------------------------------------------------------------------------
// Rate limiting (per IP, fixed window, in-memory)
// ---------------------------------------------------------------------------
// Serverless instances are ephemeral so this is a best-effort guard rather than
// a distributed limiter. It still blocks the common abuse case of a single
// client hammering the endpoint to burn through the API quota.
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const bucket = buckets.get(ip)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })

    // Opportunistic cleanup so the map cannot grow unbounded.
    if (buckets.size > 5000) {
      for (const [key, value] of buckets) {
        if (now > value.resetAt) buckets.delete(key)
      }
    }
    return { allowed: true, retryAfter: 0 }
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { allowed: true, retryAfter: 0 }
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

// ---------------------------------------------------------------------------
// Localized copy
// ---------------------------------------------------------------------------
type Language = "en" | "es" | "zh"

const MESSAGES: Record<Language, { empty: string; error: string; rateLimit: string; unavailable: string }> = {
  en: {
    empty: "I processed that, but have no words right now.",
    error: "My cognitive subroutines encountered an error. Please try again later.",
    rateLimit: "Too many requests. Please wait a moment before asking again.",
    unavailable: "The AI assistant is not configured on this deployment.",
  },
  es: {
    empty: "Procesé eso, pero no tengo palabras ahora mismo.",
    error: "Mis subrutinas cognitivas encontraron un error. Por favor intenta más tarde.",
    rateLimit: "Demasiadas solicitudes. Espera un momento antes de volver a preguntar.",
    unavailable: "El asistente de IA no está configurado en este despliegue.",
  },
  zh: {
    empty: "我已处理您的请求，但暂时无法回答。",
    error: "我的认知子程序遇到错误。请稍后再试。",
    rateLimit: "请求过多。请稍等片刻再提问。",
    unavailable: "此部署未配置 AI 助手。",
  },
}

function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "es" || value === "zh"
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  })
}

function buildSystemInstruction(language: Language): string {
  const projectsContext = JSON.stringify(
    MOCK_PROJECTS.map((p) => ({ name: p.title, techStack: p.tech, details: p.description })),
  )

  const base = `You are the AI persona of a senior software engineer's portfolio (Luis Martinez).
Here is the database of Luis's projects: ${projectsContext}.
Use this data to answer specific questions about his work.
Keep answers concise, professional, yet witty. Focus on technology, innovation, and the user's skills.
Format your response as plain prose. Do not use markdown syntax such as ** for bold or * for bullets.`

  if (language === "es") return `${base} Responde en Español.`
  if (language === "zh") return `${base} 请用中文回答。`
  return `${base} Respond in English.`
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST" })
  }

  let language: Language = "en"

  try {
    const body = (await request.json()) as { prompt?: unknown; language?: unknown }

    if (isLanguage(body.language)) language = body.language
    const copy = MESSAGES[language]

    // --- Input validation ---
    if (typeof body.prompt !== "string") {
      return json({ error: "Field 'prompt' must be a string." }, 400)
    }

    const prompt = body.prompt.trim()

    if (prompt.length === 0) {
      return json({ error: "Field 'prompt' must not be empty." }, 400)
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return json({ error: `Field 'prompt' exceeds ${MAX_PROMPT_LENGTH} characters.` }, 413)
    }

    // --- Rate limiting ---
    const { allowed, retryAfter } = checkRateLimit(getClientIp(request))
    if (!allowed) {
      return json({ error: copy.rateLimit }, 429, { "Retry-After": String(retryAfter) })
    }

    // --- API key (server-side only) ---
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY
    if (!apiKey) {
      return json({ error: copy.unavailable }, 503)
    }

    const ai = new GoogleGenAI({ apiKey })

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: { systemInstruction: buildSystemInstruction(language) },
    })

    return json({ text: response.text?.trim() || copy.empty }, 200)
  } catch (error) {
    // Log server-side for observability, but never leak internals to the client.
    console.error("[api/chat] Gemini request failed:", error)
    return json({ error: MESSAGES[language].error }, 502)
  }
}
