import { Request, Response } from 'express';
import prisma from '../prisma';
import { aiService } from '../services/aiService';
import fs from 'fs';
import path from 'path';
import { getFactSheetExtractionPrompt } from '../prompts/extractionPrompts';
import { cleanAndParseJsonObject } from '../utils/aiJsonParser';

// ======================================================================
// 案件事实摘要 AI 提取的 JSON Schema 说明（注入进 Prompt）
// ======================================================================
const FACT_SHEET_SCHEMA = `{
  "plaintiff": {
    "name": "原告姓名",
    "gender": "男或女",
    "ethnicity": "民族，如汉族",
    "idCard": "身份证号",
    "phone": "联系电话",
    "address": "户籍所在地详细地址",
    "resident": "经常居住地（如与户籍相同填：同户籍地）"
  },
  "defendant1": {
    "name": "被告1姓名（驾驶员）",
    "gender": "男或女",
    "ethnicity": "民族",
    "idCard": "身份证号",
    "phone": "联系电话",
    "address": "户籍所在地详细地址",
    "resident": "经常居住地"
  },
  "defendant2": {
    "name": "被告2姓名（车主，如与驾驶员同一人则留空字符串）",
    "gender": "",
    "ethnicity": "",
    "idCard": "",
    "phone": "",
    "address": "",
    "resident": ""
  },
  "insurer": {
    "name": "保险公司全称",
    "address": "保险公司住所地",
    "legalRep": "法定代表人/主要负责人",
    "creditCode": "统一社会信用代码"
  },
  "accident": {
    "time": "事故发生时间，如2025年2月1日17时40分",
    "location": "事故地点",
    "plate": "车牌号",
    "vehicleType": "车辆类型",
    "driverName": "驾驶员姓名",
    "process": "事故经过（完整叙述，100-200字）",
    "liabilityAuthority": "责任认定机关全称",
    "liabilityDocNo": "认定书编号",
    "liabilityResult": "责任认定结论（完整叙述）"
  },
  "insurance": {
    "tplcCompany": "交强险保险公司名称",
    "tplcPeriod": "交强险保险期间",
    "commercialCompany": "商业险/统筹公司名称",
    "commercialAmount": "商业险保额（如300万）",
    "commercialPeriod": "商业险保险期间"
  },
  "medical": {
    "hospitalizationDays": 0,
    "hospitals": "就诊医院列表（如：武汉第八医院住院14天）",
    "diagnosis": "伤情诊断",
    "surgeries": "手术名称（如有）",
    "medicalFeeBreakdown": "各院费用明细（如：665+4.5+...=56052.26元）",
    "medicalFeeTotal": 56052.26,
    "nursingType": "护工类型（雇用护工/家属护理/混合）",
    "nursingDays": 0,
    "appraisalDate": "鉴定委托日期",
    "appraisalOrg": "鉴定机构全称",
    "appraisalDocNo": "鉴定报告编号",
    "disabilityGrade": "伤残等级（如九级伤残）",
    "disabilityCoef": 0.2,
    "futureTreatment": "后续诊疗项目说明",
    "lostWorkDays": 180,
    "nursingPeriodDays": 90,
    "nutritionDays": 90,
    "appraisalFee": 2280
  },
  "claims": {
    "medicalFee": 56052.26,
    "futureTreatment": 15000,
    "hospitalFood": 700,
    "nutrition": 4500,
    "lostWage": 26902,
    "nursing": 12953,
    "disability": 187948,
    "dependent": 0,
    "mental": 10000,
    "traffic": 1200,
    "vehicleRepair": 1800,
    "appraisal": 2280,
    "totalLoss": 336654.26,
    "paidByInsurer": 20000,
    "netPayable": 316654.26
  },
  "notes": "律师备注（可选）"
}`;

/**
 * POST /cases/:id/fact-sheet/extract
 * 读取案件证据 → AI 提取结构化事实 → 返回 JSON（不自动保存）
 */
export const extractFactSheet = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const docs = await prisma.caseDocument.findMany({ where: { caseId: id } });
        const currentCase = await prisma.case.findUnique({ where: { id } });

        if (!docs || docs.length === 0) {
            return res.status(400).json({ error: '该案件暂无证据文件，无法提取。' });
        }

        const documentsContent = docs
            .map(d => `--- 文档标题: ${d.title} ---\n${d.content}\n`)
            .join('\n');

        // 读取 Skill 文件中的计算基准
        let skillContent = '';
        try {
            const skillPath = path.resolve(process.cwd(), '..', 'skills', 'traffic_accident.md');
            if (fs.existsSync(skillPath)) {
                skillContent = fs.readFileSync(skillPath, 'utf-8').substring(0, 3000); // 只取前3000字（基准参数）
            }
        } catch { /* ignore */ }

        const prompt = getFactSheetExtractionPrompt(documentsContent, currentCase?.title || '', currentCase?.parties || '', skillContent);

        const model = (req.body && req.body.model) || 'gemini-2.5-flash';
        const response = await aiService.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const parsed = cleanAndParseJsonObject<Record<string, any>>(response.text || '{}');
        if (Object.keys(parsed).length === 0) {
            return res.status(500).json({ error: 'AI 返回的 JSON 格式有误，请重试。' });
        }

        res.json({ success: true, factSheet: parsed });

    } catch (error: any) {
        console.error('[extractFactSheet] Error:', error);
        res.status(500).json({ error: error.message || 'Failed to extract fact sheet.' });
    }
};

/**
 * PUT /cases/:id/fact-sheet
 * 保存律师审核后的案件事实摘要
 */
export const saveFactSheet = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { factSheet } = req.body;

        if (!factSheet) {
            return res.status(400).json({ error: 'factSheet 不能为空。' });
        }

        const jsonStr = typeof factSheet === 'string' ? factSheet : JSON.stringify(factSheet);

        await prisma.case.update({
            where: { id },
            data: { caseFactSheet: jsonStr }
        });

        res.json({ success: true });
    } catch (error: any) {
        console.error('[saveFactSheet] Error:', error);
        res.status(500).json({ error: error.message || 'Failed to save fact sheet.' });
    }
};
