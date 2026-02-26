import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';

const prisma = new PrismaClient();

/**
 * [POST /api/cases/:id/extract-parties]
 * Re-extract parties from ALL existing CaseDocument evidence (no file upload needed).
 * Uses a strict, role-aware prompt to avoid extracting non-party entities.
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

        // 拼接所有文本，最多取前 20000 字
        const allContent = docs
            .map(d => `=== [证据: ${d.title}] ===\n${d.content}`)
            .join('\n\n');
        const textToAnalyze = allContent.substring(0, 20000);

        const prompt = `你是一位资深律师助理，拥有丰富的诉讼案件经验。请从以下案件的全部证据材料中，**精准识别并提取本案的适格诉讼主体**。

## 你必须提取的角色（适格诉讼主体）

交通事故案件中，仅提取以下法律意义上的当事人：
- **原告** / 起诉方 / 委托方 / 申请人
- **被告** / 被起诉方 / 被申请人
- **第三人**（如实际驾驶人、车辆所有人等）
- **保险公司**（涉及机动车强制险或商业险的保险人）
- **法定代理人**（如果当事人为未成年人或无民事行为能力人）

## 你絶对不能提取的非当事人角色（明确排除）

以下人员 **不是诉讼当事人**，请一律跳过：
- 鉴定机构的鉴定人、法医、签名人（如公安局鉴定人员）
- 医院的医生、护士、医疗机构工作人员
- 村委会、居委会、派出所的盖章、签名工作人员
- 户口本上的家庭其他成员（当事人的父母、兄弟姐妹、子女等，除非他们本身也是本案当事人）
- 见证人、证明人、担保人（非实质诉讼主体）
- 保险公司调查员、评估师
- 交警队办案民警（仅签名于责任认定书上的）

## 输出格式

只输出一个纯 JSON 对象，不要有任何其他文字：
{
  "extractedParties": [
    {
      "name": "当事人真实姓名或公司全称",
      "role": "原告|被告|第三人|肇事方|车主|保险公司|法定代理人",
      "idNumber": "身份证号/统一社会信用代码（没有则留空）",
      "address": "住所地（没有则留空）",
      "contact": "联系电话（没有则留空）"
    }
  ]
}

---

【案件全部证据材料】:
${textToAnalyze}`;

        const response = await aiService.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        let rawResult = response.text || '{}';
        rawResult = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
        const cleanJsonStr = rawResult.replace(/^[^{]*{/, '{').replace(/}[^}]*$/, '}');

        let extractedData: any = {};
        try {
            extractedData = JSON.parse(cleanJsonStr);
        } catch (e) {
            console.error('[ExtractParties] JSON parse error:', e, 'Raw:', rawResult.substring(0, 500));
            extractedData = { extractedParties: [] };
        }

        const newParties = extractedData.extractedParties || [];

        // 直接覆盖（不合并，因为用户明确想要重新提取）
        const updatedCase = await prisma.case.update({
            where: { id: caseId },
            data: {
                parties: JSON.stringify(newParties)
            },
            include: {
                subTasks: true,
                documents: true
            }
        });

        res.json({
            success: true,
            parties: newParties,
            caseData: {
                ...updatedCase,
                tags: JSON.parse(updatedCase.tags),
                parties: JSON.stringify(newParties)
            }
        });

    } catch (error: any) {
        console.error('[ExtractParties] Error:', error);
        res.status(500).json({
            error: '从证据中提取当事人失败',
            details: error.message
        });
    }
};
