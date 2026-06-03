import { SUPPORTED_CASE_TYPES } from '../constants';
import { cleanAndParseJsonObject } from '../utils/aiJsonParser';
import { filterEvidenceDocuments } from '../utils/evidenceRepository';
import { aiService } from './aiService';

export type EvidenceOrganizeResult = {
    sortedDocs: {
        title: string;
        evidenceType: string;
        proofPurpose: string;
        suggestedOrder: number;
        reason: string;
    }[];
    missingEvidence: { name: string; importance: string; reason: string }[];
    summary: string;
};

const EVIDENCE_CHECKLIST: Record<string, string[]> = {
    traffic_accident: ['事故认定书', '驾驶证', '行驶证', '医疗费票据', '误工证明', '伤残鉴定报告', '车辆维修费票据', '护理费票据'],
    loan_dispute: ['借条/借款合同', '转账记录/银行流水', '催款记录', '身份证明'],
    labor_contract: ['劳动合同', '工资流水', '解除/终止通知', '社保缴纳记录', '考勤记录'],
    labor_service_injury: ['劳务关系证明', '受伤经过证明', '医疗费票据及病历资料', '误工证明及收入证明', '护理费票据', '伤残鉴定报告'],
    divorce: ['结婚证', '身份证', '财产清单', '子女户口本', '房产证明'],
    sales_contract: ['买卖合同', '付款凭证', '发货/收货记录', '质量异议证明'],
    unjust_enrichment: ['转账记录', '往来沟通记录', '无合法依据证明'],
    general: ['身份证明', '相关合同', '付款凭证', '沟通记录'],
};

export const evidenceOrganizerService = {
    async organizeCaseEvidence(caseData: any): Promise<EvidenceOrganizeResult> {
        const evidenceDocs = filterEvidenceDocuments(caseData.documents || []);
        if (evidenceDocs.length === 0) {
            throw new Error('该案件暂无证据材料，请先上传证据文件');
        }

        const caseType = caseData.caseType || 'general';
        const checklist = EVIDENCE_CHECKLIST[caseType] || EVIDENCE_CHECKLIST.general;
        const caseTypeLabel = SUPPORTED_CASE_TYPES.find(t => t.value === caseType)?.label || '一般案件';
        const combinedText = evidenceDocs.map((doc: any, idx) =>
            `【文件${idx + 1}：${doc.title}】\n${doc.content.substring(0, 3000)}`
        ).join('\n\n---\n\n');

        const prompt = `你是一名专业律师助理，请分析以下案件证据材料（案件类型：${caseTypeLabel}）。

证据材料内容：
${combinedText}

标准证据清单（该案件类型通常需要）：
${checklist.map((item, i) => `${i + 1}. ${item}`).join('\n')}

请完成以下两项任务：

1. **证据排序建议**：根据证据材料的内容，判断每份文件是什么类型的证据，提炼该证据在诉讼中的证明目的，并给出建议的提交顺序（从最基础/最能支撑请求权基础的开始）。

2. **缺失证据检测**：对照标准证据清单，判断哪些证据可能缺失（在上传的材料中未找到相关内容）。

请以 JSON 格式返回，结构如下：
{
  "sortedDocs": [
    { "title": "文件名", "evidenceType": "证据类型（如：事故认定书）", "proofPurpose": "证明目的", "suggestedOrder": 1, "reason": "排序原因" }
  ],
  "missingEvidence": [
    { "name": "缺失证据名称", "importance": "high/medium/low", "reason": "为什么需要这份证据" }
  ],
  "summary": "整体评估说明（1-2句话）"
}`;

        const result = await aiService.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' },
        });

        return cleanAndParseJsonObject<EvidenceOrganizeResult>(result.text || '');
    },

    formatEvidenceListMarkdown(result: EvidenceOrganizeResult): string {
        const rows = [...(result.sortedDocs || [])].sort((a, b) => a.suggestedOrder - b.suggestedOrder);
        if (!rows.length) return '## 证据目录\n\n（暂无可整理的证据项）';

        const table = [
            '| 序号 | 证据名称 | 证据类型 | 证明目的 |',
            '| --- | --- | --- | --- |',
            ...rows.map((doc, index) =>
                `| ${index + 1} | ${doc.title || ''} | ${doc.evidenceType || ''} | ${doc.proofPurpose || doc.reason || ''} |`
            ),
        ].join('\n');

        return `## 证据目录\n\n${table}`;
    },
};

