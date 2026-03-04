import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';

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

        const prompt = `你是一位资深律师助理，拥有丰富的民商事诉讼经验，尤其擅长机动车交通事故责任纠纷案件。\n请仔细研读以下【案件全部证据材料】，然后完成三项任务并以纯 JSON 格式输出。\n\n---\n\n## 任务一：精准提取适格诉讼主体\n\n**必须提取的角色（适格诉讼主体）：**\n- 原告 / 起诉方 / 委托方 / 受害方\n- 被告 / 肇事驾驶员 / 被起诉方\n- 第三人（如实际驾驶人、车辆登记所有人等，与驾驶员不同时单独列出）\n- 保险公司（交强险/商业险的承保人，须填写全称及统一社会信用代码）\n- 法定代理人（当事人未成年/无民事行为能力时）\n\n**绝对不能提取的非当事人（明确排除）：**\n- 鉴定机构鉴定人、签名法医、公安鉴定人员\n- 医院医生、护士、医疗机构工作人员\n- 村委会/居委会/派出所盖章工作人员\n- 家庭其他成员（父母、兄弟姐妹、子女等），除非其本身是本案当事人\n- 见证人、证明人、担保人\n- 保险调查员、评估师\n- 交警队办案民警（仅签认定书）\n\n---\n\n## 任务二：撰写详细"事实与理由"叙述\n\n请参照正式民事起诉状"事实与理由"板块的写法，**从证据材料中尽可能提取所有可用信息**，按以下结构分段撰写，每段都要详尽。没有相关信息的段落可省略，但交通事故案件应尽量覆盖全部段落：\n\n1. **交通事故发生经过**：事故时间（精确到分钟）、地点、涉事车辆（车牌号/车型）、双方行驶方向、碰撞原因、事故经过。\n2. **事故责任认定**：出具认定书的机构全称、认定书编号、责任划分结论（全责/主责/次责/同等责任等）。\n3. **伤情与治疗经过**：受伤部位与诊断、就诊医院（含住院/门诊天数）、主要手术与治疗措施、各阶段医疗费用明细及合计。\n4. **司法鉴定情况**：委托鉴定机构全称、鉴定书编号、鉴定结论（伤残等级/误工期/护理期/营养期/后续治疗费用等）。\n5. **机动车投保情况**：驾驶员姓名、车主姓名（与驾驶员不同时）、车牌号、保险公司全称、险种（交强险/商业三者险/统筹险）、保险期间（是否在保内）、保额。\n6. **家庭抚养/赡养情况**（如有）：原告/受害人有无需抚养的未成年子女或需赡养的老人，具体人数及关系。\n7. **费用垫付情况**：已垫付的费用来源（个人/社保/工伤保险等），尚待主张的部分。\n8. **法律依据与诉讼请求概述**：援引的主要法律条文（如《民法典》第?条），诉讼主张的核心请求（可以省略具体金额，重点说明赔偿项目）。\n\n**写作要求：**\n- 语言规范，使用第三人称，文风与正式起诉状一致。\n- 所有数字、日期、姓名、机构名、证件号码须从证据中精确引用，不得猜测或编造。\n- 找不到的信息直接略去该句，不要填写"暂无"或空白占位。\n\n---\n\n## 任务三：判断案由（caseType）\n\n根据证据材料的内容，从以下列表中选择最匹配的案由 value 值；确实无法判断时，选 "general"：\n\n${caseTypesDesc}\n\n---\n\n## 输出格式（严格 JSON，不含任何代码块标记）\n\n{\n  "extractedParties": [\n    {\n      "name": "当事人真实姓名或公司全称",\n      "role": "原告|被告|第三人|肇事驾驶员|车主|保险公司|法定代理人",\n      "idNumber": "身份证号/统一社会信用代码（没有则留空字符串）",\n      "address": "住所地（没有则留空字符串）",\n      "contact": "联系电话（没有则留空字符串）"\n    }\n  ],\n  "caseFactsNarrative": "按上述结构撰写的完整'事实与理由'叙述，500字以上，越详细越好",\n  "caseType": "从支持列表中选择的 value 值，例如 traffic_accident"\n}\n\n---\n\n【案件全部证据材料】:\n${textToAnalyze}`;

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
