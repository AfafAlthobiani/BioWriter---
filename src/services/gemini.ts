import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export interface GeneratedBio {
  style: string;
  content: string;
  emoji: string;
}

export interface BioGenerationResponse {
  greeting: string;
  bios: GeneratedBio[];
  tip: string;
}

export async function generateBios(userInput: string, platforms: string[], language: string = 'ar'): Promise<BioGenerationResponse> {
  if (!apiKey) {
    throw new Error("Gemini API key is missing");
  }

  const platformsText = platforms.length > 0 ? platforms.join("، ") : (language === 'ar' ? "جميع المنصات" : "all platforms");

  const languageInstructions: Record<string, string> = {
    ar: "استخدم اللهجة السعودية الخليجية البيضاء (اللطيفة والقريبة من الشباب). الترحيب يجب أن يكون بلهجة سعودية حارة.",
    en: "Use modern, engaging English. The greeting should be friendly and welcoming.",
    fr: "Utilisez un français moderne et engageant. Salutation amicale.",
    es: "Usa un español moderno y atractivo. Saludo amistoso."
  };

  const ai = new GoogleGenAI({ apiKey });
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Convert this info into 4 professional bio options for (${platformsText}) in ${language === 'ar' ? 'Arabic' : language}: "${userInput}"`,
    config: {
      systemInstruction: `You are a creative assistant specialized in writing social media bios.
Rules:
1. Language & Tone: ${languageInstructions[language] || languageInstructions.ar}
2. Variety: Provide 4 different options (Professional, Fun, Simple, Creative).
3. Formatting: Use line breaks and Emojis aesthetically.
4. Constraints: Max 150 characters per bio.
5. Platform Customization:
   - TikTok: Use vibrant language, trends, and quick youthful phrases.
   - LinkedIn: Use a very professional tone focusing on achievements and practical skills.
   - Snapchat: Make it more friendly and personal.
   - Distribute options to cover the selected platforms perfectly.

The response MUST be in JSON format containing:
- greeting: A warm greeting in the selected language.
- bios: An array of 4 objects (style, content, emoji).
- tip: A quick tip about choosing a profile picture in the selected language.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          greeting: { type: Type.STRING },
          bios: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                style: { type: Type.STRING },
                content: { type: Type.STRING },
                emoji: { type: Type.STRING },
              },
              required: ["style", "content", "emoji"],
            },
          },
          tip: { type: Type.STRING },
        },
        required: ["greeting", "bios", "tip"],
      },
    },
  });

  const response = await model;
  
  if (!response.text) {
    throw new Error("EMPTY_RESPONSE");
  }

  try {
    return JSON.parse(response.text.trim());
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("PARSE_ERROR");
  }
}
