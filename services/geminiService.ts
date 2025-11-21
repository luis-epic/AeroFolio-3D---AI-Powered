
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

let ai: GoogleGenAI | null = null;

try {
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey: apiKey });
  }
} catch (error) {
  console.error("Failed to initialize Gemini Client", error);
}

export const generateAIResponse = async (prompt: string, language: 'en' | 'es' | 'zh' = 'en'): Promise<string> => {
  if (!ai) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (language === 'es') return "Estoy corriendo en modo demo porque no se encontró la API_KEY. Por favor configúrala.";
    if (language === 'zh') return "由于未找到 API_KEY，我正在演示模式下运行。请进行配置。";
    return "I am running in demo mode because no API_KEY was found. Please configure it.";
  }

  try {
    const modelId = 'gemini-2.5-flash';
    
    let systemInstruction = "You are the AI persona of a senior software engineer's portfolio (Luis Martinez). Keep answers concise, professional, yet witty. Focus on technology, innovation, and the user's skills. Respond in English.";
    
    if (language === 'es') {
        systemInstruction = "Eres la personalidad IA del portafolio de un ingeniero de software senior (Luis Martinez). Mantén las respuestas concisas, profesionales y con un toque de ingenio. Enfócate en tecnología, innovación y las habilidades del usuario. Responde en Español.";
    } else if (language === 'zh') {
        systemInstruction = "你是高级软件工程师（Luis Martinez）作品集的 AI 角色。保持回答简洁、专业且风趣。专注于技术、创新和用户的技能。请用中文回答。";
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
