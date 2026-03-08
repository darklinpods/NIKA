import prisma from '../prisma';
import fs from 'fs';
import { documentService } from './documentService';
import { aiService } from './aiService';
import { getDocumentClassificationPrompt } from '../prompts/analysisPrompts';

export const knowledgeService = {
    // 获取知识库所有文档列表（不返回全量 content，避免太重）
    async getAllDocuments() {
        return await prisma.knowledgeDocument.findMany({
            orderBy: { createdAt: 'desc' }
        });
    },

    // 删除知识文档
    async deleteDocument(id: string) {
        return await prisma.knowledgeDocument.delete({ where: { id } });
    },

    // AI 辅助分类
    async classifyDocumentCategory(content: string): Promise<string> {
        const prompt = getDocumentClassificationPrompt(content);
        try {
            const response = await aiService.generateContent({
                model: "gemini-2.0-flash", // Use a fast model for classification
                contents: [{ role: "user", parts: [{ text: prompt }] }],
            });
            const category = (response.text || 'notebook_lm').trim().toLowerCase();
            const valid = ['pleading', 'precedent', 'provision', 'notebook_lm'];
            return valid.includes(category) ? category : 'notebook_lm';
        } catch (e) {
            return 'notebook_lm';
        }
    },

    // 从上传的文件中提取内容并存入知识库
    async addDocumentFromFile(file: Express.Multer.File, category: string = 'notebook_lm') {
        const filePath = file.path;
        // 修复 Multer 处理中文等非 ASCII 文件名时的乱码问题 (latin1 -> utf8)
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

        try {
            // Read file into buffer
            const fileBuffer = fs.readFileSync(filePath);

            // 复用已有功能强大的文档解析服务，直接抽出文本
            const content = await documentService.parseDocumentContent(fileBuffer, file.mimetype, originalName);

            // 如果类别是 'auto'，则使用 AI 进行判断
            let finalCategory = category;
            if (category === 'auto') {
                finalCategory = await this.classifyDocumentCategory(content);
            }

            // 写入数据库
            const newDoc = await prisma.knowledgeDocument.create({
                data: {
                    title: originalName,
                    content,
                    category: finalCategory
                }
            });
            return newDoc;
        } finally {
            // 清理缓存文件
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    },

    // 直接添加纯文本知识文档
    async addDocumentFromText(title: string, content: string, category: string = 'notebook_lm') {
        return await prisma.knowledgeDocument.create({
            data: {
                title,
                content,
                category
            }
        });
    },

    // 更新文档元数据
    async updateDocument(id: string, data: { title?: string, category?: string }) {
        return await prisma.knowledgeDocument.update({
            where: { id },
            data
        });
    }
};
