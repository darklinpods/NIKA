import { Request, Response } from 'express';
import prisma from '../prisma';
import { aiService } from '../services/aiService';
import { getCaseCopilotSystemPrompt } from '../prompts/chatPrompts';
import { handleToolCall } from '../utils/toolExecutor';
import { RouterAgent } from '../agents/RouterAgent';

/**
 * 获取某个案件的聊天记录
 */
export const getChatHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const messages = await (prisma as any).caseChatMessage.findMany({
            where: { caseId: id },
            orderBy: { createdAt: 'asc' }
        });
        res.json({ success: true, data: messages });
    } catch (error: any) {
        console.error("Fetch Chat History Error:", error);
        res.status(500).json({ error: "Failed to fetch chat history" });
    }
};

/**
 * 发送消息并获取 AI 回复 (Case Copilot)
 */
export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { content, lang } = req.body;
        const languageName = lang === 'zh' ? 'Chinese (Simplified)' : 'English';

        // 1. 获取案件背景 (RAG)
        const targetCase = await prisma.case.findUnique({
            where: { id },
            include: { documents: true }
        });

        if (!targetCase) {
            return res.status(404).json({ error: "Case not found" });
        }

        let ragContext = `
案件标题: ${targetCase.title}
案件描述: ${targetCase.description}
当事人信息: ${(targetCase as any).parties || '暂无'}
`;

        if (targetCase.documents.length > 0) {
            ragContext += "\n关联证据与文档知识库:\n";
            targetCase.documents.forEach((doc, idx) => {
                ragContext += `--- 文档 ${idx + 1}: ${doc.title} ---\n${doc.content}\n`;
            });
        }

        // 2. 获取历史对话记录
        const history = await (prisma as any).caseChatMessage.findMany({
            where: { caseId: id },
            orderBy: { createdAt: 'asc' },
            take: 20 // 最近20条
        });

        // 3. Instantiate Router Agent and Context
        const context = {
            caseId: id,
            caseRecord: targetCase,
            ragContext: ragContext
        };

        const router = new RouterAgent();

        // 4. Execute Route and Tools Logging
        const chatParts = history.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const { responseText } = await router.routeAndExecute(context, chatParts, content, handleToolCall);
        const finalAiResponse = responseText;

        // 5. 持久化对话记录
        const savedMessages = await prisma.$transaction([
            (prisma as any).caseChatMessage.create({
                data: {
                    content,
                    role: 'user',
                    caseId: id
                }
            }),
            (prisma as any).caseChatMessage.create({
                data: {
                    content: finalAiResponse,
                    role: 'assistant',
                    caseId: id
                }
            })
        ]);

        res.json({
            success: true,
            userMessage: savedMessages[0],
            aiMessage: savedMessages[1]
        });

    } catch (error: any) {
        console.error("Case Chat Error:", error);
        res.status(500).json({ error: error.message || "Failed to process chat message" });
    }
};
