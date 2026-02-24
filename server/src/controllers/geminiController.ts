import { Request, Response } from 'express';
import { Type } from "@google/genai";
import { aiService } from '../services/aiService';

export const generateTasks = async (req: Request, res: Response) => {
    try {
        const { prompt, lang } = req.body;
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';

        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
                    text: `Generate a list of 3-5 structured legal cases for the following request: "${prompt}". 
                 The response MUST be in ${languageName}.
                 Each case must have a title, description, priority (low, medium, or high), 1-2 relevant tags, and a list of 3-5 procedural sub-tasks (as strings).` }]
            }],
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
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';

        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
                    text: `Improve and expand this task description for clarity and professionalism. 
                 The response MUST be in ${languageName}.
                 Task Title: ${taskTitle}
                 Current Description: ${taskDesc}
                 Output only the improved description text.` }]
            }],
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
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';

        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
                    text: `As an expert legal assistant, summarize this legal case in under 80 words. Focus on the core conflict and key next step.
                 Language: ${languageName}
                 Title: ${title}
                 Details: ${desc}`
                }]
            }],
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
        const { docType, caseTitle, caseDesc, lang, caseId } = req.body;
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';

        let ragContext = "";

        if (caseId) {
            const { caseService } = require('../services/caseService');
            const targetCase = await caseService.getCaseById(caseId);

            if (targetCase) {
                if (targetCase.parties) {
                    ragContext += `\n[当事人详细信息 Parties Information]:\n${targetCase.parties}\n`;
                }
                if (targetCase.documents && targetCase.documents.length > 0) {
                    ragContext += `\n[案件证据与关联文档 Evidence & Documents]:\n`;
                    targetCase.documents.forEach((doc: any, index: number) => {
                        ragContext += `--- Document ${index + 1}: ${doc.title} ---\n${doc.content}\n`;
                    });
                }
            }
        }

        let prompt = "";
        switch (docType) {
            case 'analysis':
                prompt = `Act as a senior legal expert. Analyze the following legal case. 
        Identify the core legal dispute points (Controversy Focus). 
        For each point, provide a brief legal assessment based on general legal principles.
        Format the output in Markdown.
        
        Case Title: ${caseTitle}
        Case Details: ${caseDesc}
        ${ragContext ? `\nReference Knowledge Base for Context:\n${ragContext}` : ''}
        Language: ${languageName}`;
                break;
            case 'strategy':
                prompt = `Act as a senior litigation lawyer. Propose a litigation strategy for the following case.
        Outline key evidence needed, potential risks, and recommended next steps.
        Format the output in Markdown.
  
        Case Title: ${caseTitle}
        Case Details: ${caseDesc}
        ${ragContext ? `\nReference Knowledge Base for Context:\n${ragContext}` : ''}
        Language: ${languageName}`;
                break;
            case 'offical_doc':
                prompt = `Act as a legal assistant. Draft a formal legal document structure (e.g., a Petition or Legal Opinion) for the following case.
        Include placeholders for specific facts but provide the standard legal boilerplate and structure.
        ${ragContext ? 'STRICTLY base the facts, party details, and claims on the Reference Knowledge Base provided below.' : ''}
        Format the output in Markdown.
  
        Case Title: ${caseTitle}
        Case Details: ${caseDesc}
        ${ragContext ? `\nReference Knowledge Base for Context:\n${ragContext}` : ''}
        Language: ${languageName}`;
                break;
            case 'evidence_list':
                prompt = `Act as a legal assistant. Generate a list of evidence for the following case.
          Format the output in Markdown.
    
          Case Title: ${caseTitle}
          Case Details: ${caseDesc}
          ${ragContext ? `\nReference Knowledge Base for Context:\n${ragContext}` : ''}
          Language: ${languageName}`;
                break;
        }

        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const result = response.text || "";
        res.json({ document: result });
    } catch (error: any) {
        console.error("AI Document Generation Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate document", details: error.message, stack: error.stack });
    }
};

export const generateCasePlan = async (req: Request, res: Response) => {
    try {
        const { title, desc, lang } = req.body;
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';

        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
                    text: `As a professional legal assistant, create a procedural plan for this case. 
                 Generate 4-6 specific, actionable subtasks (e.g., "Collect medical records", "Draft notice to defendant").
                 The response MUST be in ${languageName}.
                 Return a JSON object with a "subTasks" array of strings.
                 
                 Case Title: ${title}
                 Case Details: ${desc}`
                }]
            }],
        });

        const resultText = response.text || "";
        const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleaned);
        res.json(data);
    } catch (error: any) {
        console.error("AI Plan Generation Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate plan", details: error.message, stack: error.stack });
    }
};
