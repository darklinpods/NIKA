import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';

const prisma = new PrismaClient();

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

        // 3. 构造系统提示词
        const systemPrompt = `你是一位专业的法律 AI 助手 (Case Copilot)。你正在协助律师处理一个具体的案件。
你的回答必须严格基于以下提供的“案件背景知识库”和“历史对话记录”。
如果知识库中没有相关信息，请明确告知用户。
始终保持专业、客观的语气，使用 ${languageName} 进行回答。
输出格式支持 Markdown。

[案件背景知识库]
${ragContext}
`;

        // 4. 调用 Gemini (通过统一的 aiService)
        const chatParts = history.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const fullPrompt = `[System Instructions]\n${systemPrompt}\n\n[User Question]\n${content}`;

        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: chatParts.length > 0
                ? [...chatParts, { role: 'user', parts: [{ text: fullPrompt }] }]
                : [{ role: 'user', parts: [{ text: fullPrompt }] }]
        });

        const aiResponse = response.text;

        if (!aiResponse) {
            throw new Error("AI returned empty response");
        }

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
                    content: aiResponse,
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
