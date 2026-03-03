import prisma from '../prisma';
import fs from 'fs';
import { documentService } from './documentService';
import { aiService } from './aiService';

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
        const prompt = `
你是一位专业的法律助理。请阅读以下法律文档的内容片段，并将其归类为以下四类之一：
- pleading (诉状/代理词): 包含原告、被告信息，案号，或者是具体的诉讼请求和事实理由的文科。
- precedent (判例/裁定): 法院出具的民事、刑事判决书、裁定书、调解书。
- provision (法条/规定): 具体的法律条款清单、部委规章、司法解释。
- notebook_lm (办公笔记/逻辑): 律师自己的办案心得、证据清单、思维导图转录、或者是通用的法律分析笔记。

只需返回分类代码（pleading, precedent, provision, notebook_lm），不要包含任何其他说明文字。
文档内容如下：
${content.substring(0, 2000)}
`;
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
