import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';

const prisma = new PrismaClient();

/**
 * 单条发票/票据数据结构
 */
export interface InvoiceItem {
    date: string;        // 发票日期，格式 YYYY-MM-DD（无法识别时为空字符串）
    category: string;   // 费用类别，如"医疗费"、"护理费"、"交通费"等
    description: string; // 发票摘要，如开票单位/项目名称
    amount: number;     // 金额（人民币元，浮点数）
    invoiceNo: string;  // 发票号码或票据编号（无则为空字符串）
}

/**
 * [POST /api/cases/:id/extract-invoices]
 * 扫描该案件所有上传证据，提取结构化发票/票据清单，
 * 仅适用于 traffic_accident（机动车交通事故责任纠纷）案件。
 *
 * 结果以 JSON 字符串形式存入 Case.caseFactSheet：
 * { "invoices": [ ...InvoiceItem[] ] }
 */
export const extractInvoicesFromEvidence = async (req: Request, res: Response) => {
    try {
        const { id: caseId } = req.params;

        // 读取案件基本信息以校验案件类型
        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
        if (!caseRecord) {
            return res.status(404).json({ error: '案件不存在。' });
        }
        if (caseRecord.caseType !== 'traffic_accident') {
            return res.status(400).json({
                error: '发票提取功能目前仅支持"机动车交通事故责任纠纷"类型案件。'
            });
        }

        // 读取该案件所有已上传的证据文件文本
        const docs = await prisma.caseDocument.findMany({ where: { caseId } });
        if (!docs || docs.length === 0) {
            return res.status(400).json({
                error: '该案件暂无上传的证据文件，请先上传证据材料再执行提取。'
            });
        }

        // 拼接所有证据文本，最多取前 30000 字
        const allContent = docs
            .map(d => `=== [证据材料: ${d.title}] ===\n${d.content}`)
            .join('\n\n');
        const textToAnalyze = allContent.substring(0, 30000);

        // 构建发票提取 Prompt
        const prompt = [
            '你是一名专业律师助理，正在处理一起机动车交通事故责任纠纷案件。',
            '请仔细阅读以下【全部证据材料】，从中找出所有发票、收据、医疗费票据、鉴定费票据等费用凭证，',
            '并将每一张凭证的关键信息整理成一个 JSON 数组。',
            '',
            '## 提取规则',
            '',
            '- 每张发票/票据提取一个对象。',
            '- 如果一份材料内有多张发票，分别列出每一张。',
            '- 费用类别（category）请从以下类型中选择最匹配的：',
            '  医疗费 / 住院伙食补助费 / 护理费 / 交通费 / 营养费 / 残疾赔偿金 /',
            '  误工费 / 鉴定费 / 辅助器具费 / 精神损害抚慰金 / 其他费用',
            '- 金额（amount）为人民币元的数字，不含"元"字，保留两位小数。',
            '- 如果某项信息确实无法从材料中找到，对应字段填写空字符串（""）或 0（金额字段）。',
            '- 不要编造或推测任何数据。',
            '',
            '## 输出格式（严格 JSON 数组，不含任何代码块标记或额外说明）',
            '',
            '[',
            '  {',
            '    "date": "2024-12-10",',
            '    "category": "医疗费",',
            '    "description": "武汉市新洲区人民医院-住院医疗费",',
            '    "amount": 12345.67,',
            '    "invoiceNo": "0012345678"',
            '  }',
            ']',
            '',
            '---',
            '',
            `【全部证据材料】:\n${textToAnalyze}`,
        ].join('\n');

        console.log('[InvoiceExtract] Sending invoice extraction prompt to AI...');

        const response = await aiService.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        let rawResult = (response.text || '[]').trim();

        // 去除可能出现的 ```json ... ``` 包裹
        rawResult = rawResult.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        // 截取第一个 [ 到最后一个 ] 之间的内容
        const firstBracket = rawResult.indexOf('[');
        const lastBracket = rawResult.lastIndexOf(']');
        const cleanJsonStr = (firstBracket !== -1 && lastBracket !== -1)
            ? rawResult.substring(firstBracket, lastBracket + 1)
            : '[]';

        let invoices: InvoiceItem[] = [];
        try {
            invoices = JSON.parse(cleanJsonStr);
            // 确保 amount 是数字类型
            invoices = invoices.map(inv => ({
                ...inv,
                amount: typeof inv.amount === 'string' ? parseFloat(inv.amount) || 0 : (inv.amount || 0),
            }));
        } catch (e) {
            console.error('[InvoiceExtract] JSON parse error:', e, 'Raw:', rawResult.substring(0, 500));
            invoices = [];
        }

        console.log(`[InvoiceExtract] Extracted ${invoices.length} invoice items.`);

        // 将发票列表写入 Case.caseFactSheet（JSON字符串）
        // caseFactSheet 可能已有其他 keys，保留它们
        let existingFactSheet: Record<string, any> = {};
        try {
            if (caseRecord.caseFactSheet) {
                existingFactSheet = JSON.parse(caseRecord.caseFactSheet);
            }
        } catch { /* ignore */ }

        const newFactSheet = {
            ...existingFactSheet,
            invoices,
        };

        await prisma.case.update({
            where: { id: caseId },
            data: { caseFactSheet: JSON.stringify(newFactSheet) }
        });

        res.json({
            success: true,
            invoices,
            total: invoices.reduce((sum, inv) => sum + inv.amount, 0)
        });

    } catch (error: any) {
        console.error('[InvoiceExtract] Error:', error);
        res.status(500).json({
            error: '从证据中提取发票清单失败',
            details: error.message
        });
    }
};
