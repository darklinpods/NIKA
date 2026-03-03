import { Request, Response } from 'express';
import { aiTaskService } from '../services/aiTaskService';

export const generateTasks = async (req: Request, res: Response) => {
    try {
        const { prompt, lang } = req.body;
        const data = await aiTaskService.generateTasks(prompt, lang);
        res.json(data);
    } catch (error: any) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate tasks", details: error.message, stack: error.stack });
    }
};

export const suggestImprovement = async (req: Request, res: Response) => {
    try {
        const { taskTitle, taskDesc, lang } = req.body;
        const suggestion = await aiTaskService.suggestImprovement(taskTitle, taskDesc, lang);
        res.json({ suggestion });
    } catch (error: any) {
        console.error("AI Suggestion Error:", error);
        res.status(500).json({ error: error.message || "Failed to suggest improvement", details: error.message, stack: error.stack });
    }
};

export const summarizeTask = async (req: Request, res: Response) => {
    try {
        const { title, desc, lang } = req.body;
        const summary = await aiTaskService.summarizeTask(title, desc, lang);
        res.json({ summary });
    } catch (error: any) {
        console.error("AI Summary Error:", error);
        res.status(500).json({ error: error.message || "Failed to summarize task", details: error.message, stack: error.stack });
    }
};

export const generateCaseDocument = async (req: Request, res: Response) => {
    try {
        const { docType, caseTitle, caseDesc, lang, caseId } = req.body;
        const document = await aiTaskService.generateCaseDocument(docType, caseTitle, caseDesc, lang, caseId);
        res.json({ document });
    } catch (error: any) {
        console.error("AI Document Generation Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate document", details: error.message, stack: error.stack });
    }
};

export const generateCasePlan = async (req: Request, res: Response) => {
    try {
        const { title, desc, lang } = req.body;
        const data = await aiTaskService.generateCasePlan(title, desc, lang);
        res.json(data);
    } catch (error: any) {
        console.error("AI Plan Generation Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate plan", details: error.message, stack: error.stack });
    }
};
