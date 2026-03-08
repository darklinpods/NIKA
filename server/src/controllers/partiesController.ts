import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';
import { getPartiesAndFactsExtractionPrompt } from '../prompts/extractionPrompts';

const prisma = new PrismaClient();

/**
 * 所有支持案由的枚举（须与前端 constants/caseTypes.ts 同步）
 */
const SUPPORTED_CASE_TYPES = [
    { value: 'traffic_accident', label: '机动车交通事故责任纠纷' },
    { value: 'loan_dispute', label: '民间借贷' },
    { value: 'unjust_enrichment', label: '不当得利' },
    { value: 'sales_contract', label: '买卖合同纠纷' },
    { value: 'labor_contract', label: '劳务合同纠纷' },
    { value: 'divorce', label: '离婚' },
    { value: 'general', label: '一般案件（无法判断时使用）' },
];

/**
 * [POST /api/cases/:id/extract-parties]
 * 重新扫描全部上传的证据材料，一次性完成：
 * 1. 提取适格诉讼主体（当事人）
 * 2. 生成详细"事实与理由"叙述（覆盖事故经过/责任/治疗/费用/投保/抚养等）
 * 3. 自动判断案由（caseType）
 * 4. 将结果一并写回数据库
 */
export const extractPartiesFromEvidence = async (req: Request, res: Response) => {
    try {
        const { id: caseId } = req.params;

        // 读取该案件下所有已存在的证据文件文本
        const docs = await prisma.caseDocument.findMany({
            where: { caseId }
        });

        if (!docs || docs.length === 0) {
            return res.status(400).json({
                error: '该案件暂无上传的证据文件，请先上传证据后再进行提取。'
            });
        }

        // 拼接所有证据文本，最多取前 25000 字
        const allContent = docs
            .map(d => `=== [证据材料: ${d.title}] ===\n${d.content}`)
            .join('\n\n');
        const textToAnalyze = allContent.substring(0, 25000);

        const caseTypesDesc = SUPPORTED_CASE_TYPES
            .map(ct => `"${ct.value}" → ${ct.label}`)
            .join('\n');

        // 构建 Prompt（使用模板字符串换行，增强可读性）
        const prompt = getPartiesAndFactsExtractionPrompt(textToAnalyze, caseTypesDesc);

        console.log('[ExtractParties+Facts] Sending combined extraction prompt to AI...');

        const response = await aiService.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        let rawResult = response.text || '{}';
        rawResult = rawResult.replace(/```json/gi, '').replace(/```/g, '').trim();

        // 鲁棒解析：截取第一个 { 到最后一个 }
        const firstBrace = rawResult.indexOf('{');
        const lastBrace = rawResult.lastIndexOf('}');
        const cleanJsonStr = (firstBrace !== -1 && lastBrace !== -1)
            ? rawResult.substring(firstBrace, lastBrace + 1)
            : '{}';

        let extractedData: any = {};
        try {
            extractedData = JSON.parse(cleanJsonStr);
        } catch (e) {
            console.error('[ExtractParties+Facts] JSON parse error:', e, 'Raw sample:', rawResult.substring(0, 800));
            extractedData = { extractedParties: [], caseFactsNarrative: '', caseType: 'general' };
        }

        const newParties = extractedData.extractedParties || [];
        const factsText = extractedData.caseFactsNarrative || '';
        const detectedType = extractedData.caseType || 'general';

        // 校验 caseType 必须在支持列表中
        const validType = SUPPORTED_CASE_TYPES.find(ct => ct.value === detectedType)
            ? detectedType
            : 'general';

        console.log(`[ExtractParties+Facts] Parties: ${newParties.length}, Facts: ${factsText.length} chars, CaseType: ${validType}`);

        // 一次性将三项结果写入数据库
        const updateData: any = {
            parties: JSON.stringify(newParties),
            caseType: validType,
        };
        if (factsText.trim()) {
            updateData.description = factsText.trim();
        }

        const updatedCase = await prisma.case.update({
            where: { id: caseId },
            data: updateData,
            include: {
                subTasks: true,
                documents: true
            }
        });

        res.json({
            success: true,
            parties: newParties,
            caseFactsNarrative: factsText,
            caseType: validType,
            caseData: {
                ...updatedCase,
                tags: JSON.parse(updatedCase.tags),
                parties: JSON.stringify(newParties)
            }
        });

    } catch (error: any) {
        console.error('[ExtractParties+Facts] Error:', error);
        res.status(500).json({
            error: '从证据中提取当事人与案件事实失败',
            details: error.message
        });
    }
};
