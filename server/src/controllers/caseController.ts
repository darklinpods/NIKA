import { Request, Response } from 'express';
import { executeExtractParties } from '../utils/toolExecutor';
// @ts-ignore
import multer from 'multer';
import { caseService } from '../services/caseService';
import { documentService } from '../services/documentService';
import { aiAnalysisService } from '../services/aiAnalysisService';

// Multer 默认将 filename 按 Latin-1 解码，对于 UTF-8 编码的中文文件名会产生乱码。
export function fixFilename(name: string): string {
    if (!name) return name;
    try {
        return Buffer.from(name, 'latin1').toString('utf8');
    } catch {
        return name;
    }
}

// 获取案件列表
export const getCases = async (req: Request, res: Response) => {
    try {
        const cases = await caseService.getAllCases();
        res.json(cases);
    } catch (error) {
        console.error("Fetch Cases Error:", error);
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
};

// 新建单一案件
export const createCase = async (req: Request, res: Response) => {
    try {
        const result = await caseService.createCase(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error("Create Case Error:", error);
        res.status(500).json({ error: 'Failed to create case' });
    }
};

// 更新单一案件及其关联
export const updateCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const updatedCase = await caseService.updateCase(id, req.body);
        res.json(updatedCase);
    } catch (error: any) {
        console.error("Update Case Error:", error);
        res.status(500).json({ error: 'Failed to update case', details: error.message });
    }
};

// 删除案例实体
export const deleteCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await caseService.deleteCase(id);
        res.status(204).send();
    } catch (error) {
        console.error("Delete Case Error:", error);
        res.status(500).json({ error: 'Failed to delete case' });
    }
};

// 批量重排案件
export const reorderCases = async (req: Request, res: Response) => {
    try {
        const { updates } = req.body;
        if (!Array.isArray(updates)) {
            return res.status(400).json({ error: 'Invalid payload format' });
        }
        await caseService.reorderCases(updates);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Reorder Cases Error:", error);
        res.status(500).json({ error: 'Failed to reorder cases' });
    }
};

// 智能导入案件 (PDF/Word解析 + AI信息提取 + 立即入库并保存证据文档)
export const smartImportCase = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const originalName = fixFilename(req.file.originalname);
        const filename = originalName.toLowerCase();

        const extractedText = await documentService.parseDocumentContent(req.file.buffer, req.file.mimetype, filename);

        console.log(`[Smart Import] Generated ${extractedText.length} characters of raw text.`);

        // 截取前15000字，供大模型识别
        const textToAnalyze = extractedText.substring(0, 15000);

        const isPdf = req.file.mimetype === 'application/pdf' || filename.endsWith('.pdf');
        const caseData = await aiAnalysisService.extractCaseData(textToAnalyze, isPdf, isPdf ? req.file.buffer : undefined);

        // 直接在数据库创建案件，避免前端用临时 ID 保存时丢失证据
        const newCase = await caseService.createCase({
            title: caseData.title || originalName,
            description: caseData.description || '',
            priority: caseData.priority || 'medium',
            tags: caseData.tags || [],
            clientName: caseData.clientName || '',
            status: 'todo',
        });

        // 将解析出的原文保存为该案件的「原始证据材料」
        await caseService.addDocument(newCase.id, {
            title: originalName,
            content: extractedText,
            category: 'Evidence',
        });

        // 返回包含 documents 在内的完整案件对象
        const fullCase = await caseService.getCaseById(newCase.id);

        console.log(`[Smart Import] Case "${newCase.title}" (id=${newCase.id}) created with evidence document "${originalName}".`);

        res.json({ success: true, data: fullCase });

    } catch (error: any) {
        console.error("Smart Import Case Error:", error);
        res.status(500).json({ error: 'Failed to smart import case', details: error.message });
    }
};

// 上传并解析现有案件的证据文档 (保存 RAG 来源文档 & 提取当事人详情)
export const uploadEvidence = async (req: Request, res: Response) => {
    try {
        const { id: caseId } = req.params;
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const originalName = fixFilename(req.file.originalname);
        const filename = originalName.toLowerCase();

        console.log(`[Evidence Import] Processing file: ${originalName} (${req.file.mimetype}) for case: ${caseId}`);

        // 确保案件在数据库里
        const existingCase = await caseService.getCaseById(caseId);
        if (!existingCase) {
            console.log(`[Evidence Import] Case ${caseId} not found in DB. Auto-creating...`);
            await caseService.updateCase(caseId, {
                title: '待完善案件（证据先行导入）',
                description: '',
                status: 'todo',
                priority: 'medium',
            });
        }

        const extractedText = await documentService.parseDocumentContent(req.file.buffer, req.file.mimetype, filename);

        // 保存原文本作为 RAG
        await caseService.addDocument(caseId, {
            title: originalName,
            content: extractedText,
            category: "Evidence"
        });

        // Full FactAgent extraction: parties + caseType + facts narrative
        const extractResult = await executeExtractParties(caseId);

        const updatedCase = await caseService.getCaseById(caseId);
        res.json({ success: true, data: updatedCase, importedParties: (extractResult as any).parties ?? [] });

    } catch (error: any) {
        console.error("Upload Evidence Error:", error);
        res.status(500).json({ error: 'Failed to upload and parse evidence', details: error.message });
    }
};
