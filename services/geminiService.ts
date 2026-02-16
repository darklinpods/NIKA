import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";
import { handleApiError } from "../utils/errorHandler";

// Always initialize GoogleGenAI inside functions to ensure fresh state and use the latest available API key

export const generateTasks = async (prompt: string, lang: 'en' | 'zh'): Promise<AIResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a list of 3-5 structured legal cases for the following request: "${prompt}". 
               The response MUST be in ${languageName}.
               Each case must have a title, description, priority (low, medium, or high), 1-2 relevant tags, and a list of 3-5 procedural sub-tasks (as strings).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                priority: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                subTasks: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              propertyOrdering: ["title", "description", "priority", "tags", "subTasks"]
            }
          }
        },
      }
    }
  });

  // Access the generated text content directly via the .text property
  const resultText = response.text || "";
  try {
    return JSON.parse(resultText.trim());
  } catch (error) {
    throw handleApiError(error);
  }
};

export const suggestImprovement = async (taskTitle: string, taskDesc: string, lang: 'en' | 'zh'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Improve and expand this task description for clarity and professionalism. 
               The response MUST be in ${languageName}.
               Task Title: ${taskTitle}
               Current Description: ${taskDesc}
               Output only the improved description text.`,
  });
  try {
    // Access result content using the .text property
    return response.text || taskDesc;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const summarizeTask = async (title: string, desc: string, lang: 'en' | 'zh'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `As an expert legal assistant, summarize this legal case in under 80 words. Focus on the core conflict and key next step.
               Language: ${languageName}
               Title: ${title}
               Details: ${desc}`,
  });
  try {
    // Access result content using the .text property
    return response.text || "";
  } catch (error) {
    throw handleApiError(error);
  }
};