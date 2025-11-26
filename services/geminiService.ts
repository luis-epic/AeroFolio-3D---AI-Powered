import { GoogleGenAI } from "@google/genai";
import { MOCK_PROJECTS } from "../constants";

// Declare process to avoid TypeScript errors if @types/node is not available
declare const process: {
  env: {
    API_KEY: string | undefined;
    [key: string]: string | undefined;
  };
};

// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const apiKey = process.env.API_KEY || '';

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

export const generateAIResponse = async (prompt: string, language: 'en' | 'es' | 'zh' = 'en'): Promise<string> => {
  if (!ai) {
    // Simulate network delay for realism in demo mode
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (language === 'es') return "Estoy corriendo en modo demo porque no se encontró la API_KEY. Por favor configúrala en Vercel (Settings > Environment Variables).";
    if (language === 'zh') return "由于未找到 API_KEY，我正在演示模式下运行。请在 Vercel 设置中配置它。";
    return "I am running in demo mode because no API_KEY was found. Please configure it in Vercel (Settings > Environment Variables).";
  }

  try {
    const modelId = 'gemini-2.5-flash';
    
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

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    if (response.text) return response.text;

    // Fallback messages if response is empty
    if (language === 'es') return "Procesé eso, pero no tengo palabras ahora mismo.";
    if (language === 'zh') return "我已处理您的请求，但暂时无法回答。";
    return "I processed that, but have no words right now.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    if (language === 'es') return "Mis subrutinas cognitivas encontraron un error. Por favor intenta más tarde.";
    if (language === 'zh') return "我的认知子程序遇到错误。请稍后再试。";
    return "My cognitive subroutines encountered an error. Please try again later.";
  }
};