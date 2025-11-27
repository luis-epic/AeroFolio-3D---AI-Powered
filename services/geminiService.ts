import { GoogleGenAI } from "@google/genai";
import { MOCK_PROJECTS } from "../constants";
import { getApiKey } from "../config/env";

// The API key is obtained from centralized configuration
const apiKey = getApiKey();

let ai: GoogleGenAI | null = null;

if (!apiKey) {
  console.warn("⚠️ AeroFolio Warning: API_KEY not found in environment variables. AI features will run in Demo Mode.");
}

try {
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey: apiKey });
  }
} catch (error) {
  console.error("Failed to initialize Gemini Client", error);
}

// Error messages by language
const getErrorMessage = (language: 'en' | 'es' | 'zh', error: unknown): string => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Network/timeout errors
  if (errorMessage.includes('Timeout') || errorMessage.includes('timeout') || errorMessage.includes('network')) {
    if (language === 'es') return "Error de conexión. Por favor verifica tu internet e intenta nuevamente.";
    if (language === 'zh') return "连接错误。请检查您的网络连接后重试。";
    return "Connection error. Please check your internet connection and try again.";
  }
  
  // API key errors
  if (errorMessage.includes('API') || errorMessage.includes('key') || errorMessage.includes('401') || errorMessage.includes('403')) {
    if (language === 'es') return "Error de autenticación. Por favor verifica tu API key.";
    if (language === 'zh') return "身份验证错误。请检查您的 API 密钥。";
    return "Authentication error. Please verify your API key.";
  }
  
  // Rate limit errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    if (language === 'es') return "Demasiadas solicitudes. Por favor espera un momento e intenta nuevamente.";
    if (language === 'zh') return "请求过多。请稍等片刻后重试。";
    return "Too many requests. Please wait a moment and try again.";
  }
  
  // Generic error
  if (language === 'es') return "Mis subrutinas cognitivas encontraron un error. Por favor intenta más tarde.";
  if (language === 'zh') return "我的认知子程序遇到错误。请稍后再试。";
  return "My cognitive subroutines encountered an error. Please try again later.";
};

// Retry configuration
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000; // 30 seconds
const INITIAL_RETRY_DELAY = 1000; // 1 second

export const generateAIResponse = async (
  prompt: string, 
  language: 'en' | 'es' | 'zh' = 'en',
  retries: number = MAX_RETRIES
): Promise<string> => {
  if (!ai) {
    // Simulate network delay for realism in demo mode
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (language === 'es') return "Estoy corriendo en modo demo porque no se encontró la API_KEY. Por favor configúrala en tu archivo .env.local.";
    if (language === 'zh') return "由于未找到 API_KEY，我正在演示模式下运行。请在 .env.local 文件中配置它。";
    return "I am running in demo mode because no API_KEY was found. Please configure it in your .env.local file.";
  }

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const modelId = 'gemini-1.5-flash';

      // RAG-LITE: Inject project data directly into the system context
      const projectsContext = JSON.stringify(MOCK_PROJECTS.map(p => ({
        name: p.title,
        techStack: p.tech,
        details: p.description
      })));

      let baseInstruction = `You are the AI persona of a senior software engineer's portfolio (Luis Martinez). 
      Here is the database of Luis's projects: ${projectsContext}.
      Use this data to answer specific questions about his work. 
      Keep answers concise, professional, yet witty. Focus on technology, innovation, and the user's skills.`;

      let systemInstruction = baseInstruction + " Respond in English.";

      if (language === 'es') {
        systemInstruction = baseInstruction + " Responde en Español.";
      } else if (language === 'zh') {
        systemInstruction = baseInstruction + " 请用中文回答。";
      }

      // Add timeout to prevent hanging requests
      const response = await Promise.race([
        ai.models.generateContent({
          model: modelId,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
        )
      ]);

      if (response.text) return response.text;

      // Fallback messages if response is empty
      if (language === 'es') return "Procesé eso, pero no tengo palabras ahora mismo.";
      if (language === 'zh') return "我已处理您的请求，但暂时无法回答。";
      return "I processed that, but have no words right now.";

    } catch (error) {
      const isLastAttempt = attempt === retries;
      
      // Log error with attempt number
      console.error(`Gemini API Error (attempt ${attempt}/${retries}):`, error);
      
      // If last attempt, return user-friendly error message
      if (isLastAttempt) {
        return getErrorMessage(language, error);
      }
      
      // Exponential backoff: wait longer between retries
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms... (attempt ${attempt}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  return getErrorMessage(language, new Error('Unknown error'));
};