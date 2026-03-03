import { Request, Response } from 'express';
import { knowledgeService } from '../services/knowledgeService';

export const knowledgeController = {
    async getAll(req: Request, res: Response) {
        try {
            const docs = await knowledgeService.getAllDocuments();
            res.json(docs);
        } catch (error: any) {
            console.error('[KnowledgeController] getAll Error:', error);
            res.status(500).json({ error: error.message || 'Failed to fetch knowledge documents' });
        }
    },

    async uploadDocument(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            const category = req.body.category || 'notebook_lm';
            const newDoc = await knowledgeService.addDocumentFromFile(req.file, category);
            res.status(201).json(newDoc);
        } catch (error: any) {
            console.error('[KnowledgeController] uploadDocument Error:', error);
            res.status(500).json({ error: error.message || 'Failed to process document upload' });
        }
    },

    async addTextDocument(req: Request, res: Response) {
        try {
            const { title, content, category } = req.body;
            if (!title || !content) {
                return res.status(400).json({ error: 'Title and content are required' });
            }
            const newDoc = await knowledgeService.addDocumentFromText(title, content, category);
            res.status(201).json(newDoc);
        } catch (error: any) {
            console.error('[KnowledgeController] addTextDocument Error:', error);
            res.status(500).json({ error: error.message || 'Failed to add text document' });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await knowledgeService.deleteDocument(id);
            res.json({ message: 'Knowledge document deleted successfully' });
        } catch (error: any) {
            console.error('[KnowledgeController] delete Error:', error);
            res.status(500).json({ error: error.message || 'Failed to delete knowledge document' });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { title, category } = req.body;
            const updated = await knowledgeService.updateDocument(id, { title, category });
            res.json(updated);
        } catch (error: any) {
            console.error('[KnowledgeController] update Error:', error);
            res.status(500).json({ error: error.message || 'Failed to update knowledge document' });
        }
    }
};
