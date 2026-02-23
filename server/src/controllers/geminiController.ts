
import { Request, Response } from 'express';
import { GoogleGenAI, Type } from "@google/genai";

// Initialize AI client
const getGenAIClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Gemini API Key is missing.");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateTasks = async (req: Request, res: Response) => {
    try {
        const { prompt, lang } = req.body;
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

        const resultText = response.text || "";
        const data = JSON.parse(resultText.trim());
        res.json(data);
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate tasks", details: error.message, stack: error.stack });
    }
};

export const suggestImprovement = async (req: Request, res: Response) => {
    try {
        const { taskTitle, taskDesc, lang } = req.body;
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

        const result = response.text || taskDesc;
        res.json({ suggestion: result });
    } catch (error: any) {
        console.error("AI Suggestion Error:", error);
        res.status(500).json({ error: error.message || "Failed to suggest improvement", details: error.message, stack: error.stack });
    }
};

export const summarizeTask = async (req: Request, res: Response) => {
    try {
        const { title, desc, lang } = req.body;
        const ai = getGenAIClient();
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `As an expert legal assistant, summarize this legal case in under 80 words. Focus on the core conflict and key next step.
                 Language: ${languageName}
                 Title: ${title}
                 Details: ${desc}`,
        });

        const result = response.text || "";
        res.json({ summary: result });
    } catch (error: any) {
        console.error("AI Summary Error:", error);
        res.status(500).json({ error: error.message || "Failed to summarize task", details: error.message, stack: error.stack });
    }
};

export const generateCaseDocument = async (req: Request, res: Response) => {
    try {
        const { docType, caseTitle, caseDesc, lang } = req.body;
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

        const result = response.text || "";
        res.json({ document: result });
    } catch (error: any) {
        console.error("AI Document Generation Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate document", details: error.message, stack: error.stack });
    }
};
