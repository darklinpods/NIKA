import { Type } from "@google/genai";
import { aiService } from './aiService';
import { caseService } from './caseService';
import { knowledgeService } from './knowledgeService';
import { getTaskGenerationPrompt, getTaskImprovementPrompt, getTaskSummaryPrompt } from '../prompts/taskPrompts';

export const aiTaskService = {
    async generateTasks(prompt: string, lang: string) {
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';
        const kDocs = await knowledgeService.getAllDocuments();
        let kContext = '';
        if (kDocs && kDocs.length > 0) {
            const cats: Record<string, string> = {
                'pleading': 'Original Pleadings/Drafts',
                'precedent': 'Court Precedents',
                'provision': 'Legal Provisions',
                'notebook_lm': 'Logic & Notes'
            };
            const grouped = kDocs.reduce((acc: any, doc: any) => {
                const catName = cats[doc.category] || 'General Knowledge';
                if (!acc[catName]) acc[catName] = [];
                acc[catName].push(`Title: ${doc.title}\nContent: ${doc.content}`);
                return acc;
            }, {});

            kContext = "\n[System Knowledge Base / Guidelines]:\n";
            for (const [cat, items] of Object.entries(grouped)) {
                kContext += `### ${cat} ###\n${(items as string[]).join('\n\n')}\n\n`;
            }
            kContext += "\nPlease analyze the current case based on these guidelines.\n";
        }

        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
            text: getTaskGenerationPrompt(prompt, languageName, kContext) }]
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
        return JSON.parse(resultText.trim());
    },

    async suggestImprovement(taskTitle: string, taskDesc: string, lang: string) {
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';
        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
                    text: getTaskImprovementPrompt(taskTitle, taskDesc, languageName) }]
            }],
        });
        return response.text || taskDesc;
    },

    async summarizeTask(title: string, desc: string, lang: string) {
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';
        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
                    text: getTaskSummaryPrompt(title, desc, languageName)
                }]
            }],
        });
        return response.text || "";
    },

    async generateCaseDocument(docType: string, caseTitle: string, caseDesc: string, lang: string, caseId?: string) {
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';
        let ragContext = "";

        if (caseId) {
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

        const kDocs = await knowledgeService.getAllDocuments();
        if (kDocs && kDocs.length > 0) {
            const cats: Record<string, string> = {
                'pleading': 'Pleadings Reference',
                'precedent': 'Case Precedents',
                'provision': 'Legal Provisions',
                'notebook_lm': 'Strategic Notes'
            };
            const grouped = kDocs.reduce((acc: any, doc: any) => {
                const catName = cats[doc.category] || 'Knowledge Base';
                if (!acc[catName]) acc[catName] = [];
                acc[catName].push(`Title: ${doc.title}\nContent: ${doc.content}`);
                return acc;
            }, {});

            ragContext += "\n[Global Knowledge Base / Firm Guidelines]:\n";
            for (const [cat, items] of Object.entries(grouped)) {
                ragContext += `### ${cat} ###\n${(items as string[]).join('\n\n')}\n\n`;
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

        return response.text || "";
    },

    async generateCasePlan(title: string, desc: string, lang: string) {
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';
        const kDocs = await knowledgeService.getAllDocuments();
        let kContext = '';
        if (kDocs && kDocs.length > 0) {
            const cats: Record<string, string> = {
                'pleading': 'Workflow from Pleadings',
                'precedent': 'Procedural Precedents',
                'provision': 'Procedural Requirements',
                'notebook_lm': 'Internal Logic/Notes'
            };
            const grouped = kDocs.reduce((acc: any, doc: any) => {
                const catName = cats[doc.category] || 'Guidelines';
                if (!acc[catName]) acc[catName] = [];
                acc[catName].push(`Title: ${doc.title}\nContent: ${doc.content}`);
                return acc;
            }, {});

            kContext = "\n[System Knowledge Base / Guidelines]:\n";
            for (const [cat, items] of Object.entries(grouped)) {
                kContext += `### ${cat} ###\n${(items as string[]).join('\n\n')}\n\n`;
            }
            kContext += "\nPlease follow the workflows suggested in the guidelines above.\n";
        }

        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
                    text: `As a professional legal assistant, create a procedural plan for this case. 
                 Generate 4-6 specific, actionable subtasks (e.g., "Collect medical records", "Draft notice to defendant").
                 ${kContext}
                 The response MUST be in ${languageName}.
                 Return a JSON object with a "subTasks" array of strings.
                 
                 Case Title: ${title}
                 Case Details: ${desc}`
                }]
            }],
        });

        const resultText = response.text || "";
        const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    }
};
