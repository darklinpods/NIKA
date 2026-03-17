import { Request, Response } from 'express';
import prisma from '../prisma';
import { executeExtractInvoices } from '../utils/toolExecutor';

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

        // 复用 toolExecutor 中的核心逻辑
        const result = await executeExtractInvoices(caseId);

        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            success: true,
            invoices: result.invoices,
            total: result.total
        });

    } catch (error: any) {
        console.error('[InvoiceExtract] Error:', error);
        res.status(500).json({
            error: '从证据中提取发票清单失败',
            details: error.message
        });
    }
};
