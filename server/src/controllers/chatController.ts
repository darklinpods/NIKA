import { Request, Response } from 'express';
import prisma from '../prisma';
import { handleToolCall } from '../utils/toolExecutor';
import { RouterAgent } from '../agents/RouterAgent';
import { caseService } from '../services/caseService';

/** 获取指定案件的聊天历史记录（按时间升序） */
export const getChatHistory = async (req: Request, res: Response) => {
    try {
        const messages = await prisma.caseChatMessage.findMany({
            where: { caseId: req.params.id },
            orderBy: { createdAt: 'asc' }
        });
        res.json({ success: true, data: messages });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch chat history', details: error.message });
    }
};

/**
 * 发送用户消息并获取 AI 回复。
 * 流程：构建 RAG 上下文 → RouterAgent 路由并执行 → 事务保存双方消息
 */
export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        const targetCase = await prisma.case.findUnique({ where: { id }, include: { documents: true } });
        if (!targetCase) return res.status(404).json({ error: 'Case not found' });

        const ragContext = caseService.buildRagContext(targetCase);
        const context = { caseId: id, caseRecord: targetCase, ragContext };

        const history = await prisma.caseChatMessage.findMany({
            where: { caseId: id }, orderBy: { createdAt: 'asc' }, take: 20
        });
        const chatParts = history.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const { responseText } = await new RouterAgent().routeAndExecute(context, chatParts, content, handleToolCall);

        const saved = await prisma.$transaction([
            prisma.caseChatMessage.create({ data: { content, role: 'user', caseId: id } }),
            prisma.caseChatMessage.create({ data: { content: responseText, role: 'assistant', caseId: id } })
        ]);

        res.json({ success: true, userMessage: saved[0], aiMessage: saved[1] });
    } catch (error: any) {
        console.error('Case Chat Error:', error);
        res.status(500).json({ error: error.message || 'Failed to process chat message' });
    }
};

/** 删除单条聊天消息 */
export const deleteMessage = async (req: Request, res: Response) => {
    try {
        await prisma.caseChatMessage.delete({ where: { id: req.params.messageId } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to delete message', details: error.message });
    }
};

/** 清空指定案件的全部聊天记录 */
export const clearHistory = async (req: Request, res: Response) => {
    try {
        await prisma.caseChatMessage.deleteMany({ where: { caseId: req.params.id } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to clear chat history', details: error.message });
    }
};
