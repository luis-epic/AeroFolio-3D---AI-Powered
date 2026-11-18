/**
 * Client-side AI service.
 *
 * SECURITY: This module intentionally contains no API key and no direct call to
 * Google. All model access goes through the `/api/chat` serverless function so
 * the credential stays on the server.
 */

export type Language = "en" | "es" | "zh"

export class AIUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AIUnavailableError"
  }
}

const FALLBACK_ERROR: Record<Language, string> = {
  en: "My cognitive subroutines encountered an error. Please try again later.",
  es: "Mis subrutinas cognitivas encontraron un error. Por favor intenta más tarde.",
  zh: "我的认知子程序遇到错误。请稍后再试。",
}

const NETWORK_ERROR: Record<Language, string> = {
  en: "I could not reach my reasoning engine. Check your connection and try again.",
  es: "No pude conectar con mi motor de razonamiento. Revisa tu conexión e intenta de nuevo.",
  zh: "无法连接到推理引擎。请检查网络后重试。",
}

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Sends a prompt to the AI assistant.
 *
 * Resolves with the assistant's reply. When knowledgeMode is true, it routes with
 * full NotebookLM grounding, and can query the local vault if the backend is unreachable.
 * When knowledgeMode is false, it runs in General AI mode.
 */
export const generateAIResponse = async (
  prompt: string,
  language: Language = "en",
  knowledgeMode: boolean = true
): Promise<string> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, language, knowledgeMode }),
      signal: controller.signal,
    })

    const data = (await response.json().catch(() => null)) as { text?: string; error?: string } | null

    if (!response.ok) {
      if (knowledgeMode) {
        const { queryKnowledgeVault } = await import("../data/knowledgeVault")
        const vaultAnswer = queryKnowledgeVault(prompt, language)
        if (vaultAnswer) return vaultAnswer
      }
      return data?.error || FALLBACK_ERROR[language]
    }

    return data?.text || FALLBACK_ERROR[language]
  } catch {
    // If serverless is offline or local dev, consult the NotebookLM Knowledge Vault if enabled
    if (knowledgeMode) {
      const { queryKnowledgeVault } = await import("../data/knowledgeVault")
      const vaultAnswer = queryKnowledgeVault(prompt, language)
      if (vaultAnswer) return vaultAnswer
    }
    return NETWORK_ERROR[language]
  } finally {
    clearTimeout(timeout)
  }
}
