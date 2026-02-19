import { GoogleGenAI, Type } from "@google/genai";
import { AIResponse } from "../types";
import { handleApiError } from "../utils/errorHandler";

// Always initialize GoogleGenAI inside functions to ensure fresh state and use the latest available API key
const getGenAIClient = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file.");
  }
  return new GoogleGenAI({ apiKey });
};


export const generateTasks = async (prompt: string, lang: 'en' | 'zh'): Promise<AIResponse> => {
  const ai = getGenAIClient();
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
  const ai = getGenAIClient();
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
  const ai = getGenAIClient();
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

export const generateCaseDocument = async (
  docType: 'analysis' | 'strategy' | 'offical_doc' | 'evidence_list',
  caseTitle: string,
  caseDesc: string,
  lang: 'en' | 'zh'
): Promise<string> => {
  const ai = getGenAIClient();
  const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';

  let prompt = "";
  switch (docType) {
    case 'analysis':
      prompt = `Act as a senior legal expert. Analyze the following legal case. 
      Identify the core legal dispute points (Controversy Focus). 
      For each point, provide a brief legal assessment based on general legal principles.
      Format the output in Markdown.
      
      Case Title: ${caseTitle}
      Case Details: ${caseDesc}
      Language: ${languageName}`;
      break;
    case 'strategy':
      prompt = `Act as a senior litigation lawyer. Propose a litigation strategy for the following case.
      Outline key evidence needed, potential risks, and recommended next steps.
      Format the output in Markdown.

      Case Title: ${caseTitle}
      Case Details: ${caseDesc}
      Language: ${languageName}`;
      break;
    case 'offical_doc':
      prompt = `Act as a legal assistant. Draft a formal legal document structure (e.g., a Petition or Legal Opinion) for the following case.
      Include placeholders for specific facts but provide the standard legal boilerplate and structure.
      Format the output in Markdown.

      Case Title: ${caseTitle}
      Case Details: ${caseDesc}
      Language: ${languageName}`;
      break;
    case 'evidence_list':
      prompt = `Act as a legal assistant. Generate a list of evidence for the following case.
        Format the output in Markdown.
  
        Case Title: ${caseTitle}
        Case Details: ${caseDesc}
        Language: ${languageName}`;
      break;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  try {
    return response.text || "";
  } catch (error) {
    throw handleApiError(error);
  }
};