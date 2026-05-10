import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function translateQuestions(questions: any[], targetLang: string, user: any): Promise<any[]> {
  if (targetLang === 'English' || !targetLang) return questions;
  if (!questions || questions.length === 0) return [];
  
  try {
    const prompt = `
      You are an expert educational translator specializing in competitive exam content.
      Translate the following array of questions from English to ${targetLang}.
      
      Rules:
      1. Maintain standard JSON structure.
      2. Keep mathematical formulas, technical terms, and placeholders unchanged if they are in English standard.
      3. Provide the translation in the exact same index order.
      4. Ensure natural sounding language for students.
      5. Output ONLY the raw JSON array.
      
      Data to translate:
      ${JSON.stringify(questions)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let text = response.text.trim();
    
    // Sanitization
    if (text.startsWith("```json")) {
      text = text.replace(/```json\n?/, "").replace(/```$/, "");
    }

    const translated = JSON.parse(text);
    
    // Ensure we return the same length
    if (Array.isArray(translated) && translated.length === questions.length) {
      return translated;
    }
    
    console.warn('Translation length mismatch or invalid format');
    return questions;
  } catch (error) {
    console.error('Translation error:', error);
    // Return original questions as fallback so the student can at least take the test
    return questions;
  }
}
