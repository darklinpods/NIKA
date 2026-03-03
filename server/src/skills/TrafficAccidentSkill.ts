import { aiService } from '../services/aiService';
import fs from 'fs';
import path from 'path';

/**
 * 交通事故 Skill：
 *   - generateClaimText()  → Markdown 格式全文，用于预览/编辑（保留）
 *   - generateDocxVariables() → 22个变量 JSON，用于填充 docxtemplater Word 模板
 */
export class TrafficAccidentSkill {

    /**
     * 读取 skills/traffic_accident.md 的内容
     */
    private getSkillContent(): string {
        const skillPath = path.resolve(process.cwd(), '..', 'skills', 'traffic_accident.md');
        if (!fs.existsSync(skillPath)) {
            const altPath = path.resolve(process.cwd(), 'skills', 'traffic_accident.md');
            if (fs.existsSync(altPath)) {
                return fs.readFileSync(altPath, 'utf-8');
            }
            console.warn('[TrafficAccidentSkill] Skill file not found at:', skillPath);
            return '';
        }
        return fs.readFileSync(skillPath, 'utf-8');
    }

    /**
     * 调用 AI → 生成完整的诉状文本（Markdown 格式，用于左边编辑预览）
     */
    public async generateClaimText(params: {
        documentsContent: string;
        caseTitle: string;
        caseDescription: string;
        parties: string;
    }): Promise<string> {

        const skillContent = this.getSkillContent();

        const prompt = `你是一位资深的交通事故赔偿律师助理。现在请你根据下方提供的【Skill 规则文件】和【案件证据材料】，生成一份完整的、可直接提交法院的民事起诉状文本。

## 你的任务

1. 仔细阅读 Skill 规则文件中的"赔偿基准参数"，这是你计算各项赔偿金额的标准依据。
2. 仔细阅读案件证据材料，从中提取住院天数、误工天数、护理天数、伤残等级、医疗费发票金额等核心数据。
3. 判断本案属于"人伤类"还是"车损类"还是"混合类"，只列出与本案相关的索赔项目。
4. 对于每一个索赔项目，必须写出完整的计算公式展开式，例如："住院伙食补助费：50元/天 × 28天 = 1400元"
5. 所有的乘法、除法、加法计算必须精确无误！请你仔细验算每一步。
6. 最后按照 Skill 规则文件中的"诉状模板结构"，组装成完整的起诉状。

## 输出格式要求

请直接输出 Markdown 格式的完整起诉状文本，包含以下部分：
- **标题**：民事起诉状
- **当事人信息**：原告、被告基本信息
- **诉讼请求**：逐项列出赔偿请求（含计算公式）
- **索赔清单**：每项损失的详细计算
- **合计金额**：总计、垫付扣除、最终金额
- **事实和理由**：事故经过、责任认定、法律依据
- **落款**：具状人、日期

不要输出任何额外的解释或前言，直接输出起诉状正文。

---

【Skill 规则文件】
${skillContent}

---

【案件基本信息】
案件标题：${params.caseTitle}
案件描述：${params.caseDescription}

【当事人结构化数据（极重要，请优先使用此处的姓名/性别/民族/电话/地址等详细信息）】
${params.parties || '暂未提取到结构化的当事人信息，请从下方证据材料原文中提取。'}

---

【案件证据材料原文】
${params.documentsContent}

---

请根据以上信息，生成完整的民事起诉状。`;

        const response = await aiService.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        let text = response.text || '';
        text = text.replace(/^```markdown\n?/i, '').replace(/\n?```$/i, '').trim();

        return text;
    }

    /**
     * 调用 AI → 生成 Word 模板的 22 个填充变量（JSON 对象）
     * 用于 docxtemplater 渲染 traffic_accident_with_vars.docx
     */
    public async generateDocxVariables(params: {
        documentsContent: string;
        caseTitle: string;
        caseDescription: string;
        parties: string;
        model?: string;
    }): Promise<Record<string, string>> {

        const skillContent = this.getSkillContent();
        const model = params.model || 'gemini-2.5-flash';

        const prompt = `你是一位资深的交通事故赔偿律师助理。请根据下方的【Skill 规则文件】和【案件证据材料】，提取并计算出诉状所需的所有信息，然后以 JSON 格式输出。

## 你的任务

1. 优先从下方的【当事人结构化数据】中提取所有当事人信息（原告、被告驾驶员、车主、保险公司）。该数据是系统精准解析的 JSON，**请务必严格使用这些已解析数据来填充当事人相关的变量（如 Name、Phone、Address、Gender、Ethnicity 等）**，仅在此对象中缺失相应数据时，才去下方的证据材料原文中补充寻找。
2. 从证据材料（特别是《司法鉴定意见书》）中提取住院天数、误工天数、护理天数、伤残等级及赔偿系数。
3. 严格使用 Skill 规则文件中的"赔偿计算基准参数"计算每一项赔偿金额，每项都要展示计算公式。
4. 计算结果必须精确，所有数字计算仔细验算。
5. 按照以下 JSON 格式输出，不输出任何其他内容。

## 输出格式（严格 JSON，不加注释）

\`\`\`json
{
  "plaintiffName": "原告姓名",
  "plaintiffGender": "男 或 女",
  "plaintiffEthnicity": "汉族（或其他民族）",
  "plaintiffPhone": "原告联系电话",
  "plaintiffAddress": "原告户籍所在地详细地址",
  "plaintiffResident": "原告经常居住地，如与户籍相同填同户籍地",
  "defendant1Name": "被告1（驾驶员）姓名",
  "defendant1Gender": "男 或 女",
  "defendant1Ethnicity": "汉族（或其他民族）",
  "defendant1Phone": "被告1联系电话",
  "defendant1Address": "被告1户籍所在地详细地址",
  "defendant1Resident": "被告1经常居住地",
  "defendant2Name": "被告2（车主）姓名，如与驾驶员相同则留空字符串",
  "defendant2Gender": "男 或 女，如无被告2则留空",
  "defendant2Ethnicity": "如无被告2则留空",
  "defendant2Address": "如无被告2则留空",
  "defendant2Resident": "如无被告2则留空",
  "insurer1Name": "保险公司全称",
  "insurer1Address": "保险公司住所地详细地址",
  "insurer1LegalRep": "法定代表人或主要负责人姓名",
  "insurer1CreditCode": "统一社会信用代码",
  "defendantDriver": "驾驶员简短姓名（用于诉讼请求句中）",
  "defendantOwner": "车主简短姓名（用于诉讼请求句中）",
  "tplcInsurer": "交强险保险公司简称",
  "commercialInsurer": "商业险/统筹公司简称",
  "totalCompensation": "诉讼请求总金额（带单位，如：291,022.94元）",
  "medicalFeeText": "治疗费金额（含各院费用明细计算式）",
  "futureTreatmentText": "后期治疗费：15,000元（或据实结算）",
  "hospitalFoodText": "住院伙食补助费：50元/天×XX天=XXX元",
  "nutritionText": "营养费：50元/天×XX天=XXX元",
  "lostWageText": "误工费：54,553元/年÷365天×XX天=XXX元",
  "nursingText": "护理费（含计算公式和合计）",
  "disabilityCompText": "残疾赔偿金：46,987元/年×XX%×XX年=XXX元",
  "dependentText": "无 或 被扶养人生活费具体金额和说明",
  "mentalCompText": "精神损害抚慰金：XX,000元",
  "trafficFeeText": "交通费（金额及说明）",
  "vehicleRepairText": "无 或 车辆维修费：XXX元",
  "appraisalFeeText": "鉴定费：2,280元",
  "totalLoss": "原告各项损失合计金额（纯数字，不带单位）",
  "paidByInsurer": "保险公司已垫付金额（纯数字，没有则填0）",
  "netPayable": "扣除后最终应赔偿金额（纯数字）",
  "plaintiffSignName": "原告姓名（落款用）",
  "accidentFacts": "一段完整的事故经过叙述，包括时间、地点、驾驶员、车型、事故过程、伤亡后果。约200字。",
  "liabilityDetermination": "一段完整的责任认定叙述，包括交警队名称、认定书编号、各方责任划分结论。约100字。",
  "insuranceStatus": "一段完整的投保情况叙述，包括车辆、车主、交强险/商业险/统筹的保险公司名称、保险期间、事故是否在期间内。约100字。",
  "otherFacts": "一段完整的其他情况叙述，包括：原告受伤住院经过、护工费、鉴定委托情况、鉴定结论（伤残等级/误工期/护理期/营养期/鉴定费）。约300字。"
}
\`\`\`

---

【Skill 规则文件】
${skillContent}

---

【案件基本信息】
案件标题：${params.caseTitle}
案件描述：${params.caseDescription}

【当事人结构化数据（极重要，请务必优先映射系统已解析的当事人信息至下方要求的各当事人变量，保证一致性，而不是重新从证据瞎编或者漏掉电话和住址）】
${params.parties || '暂未提取到结构化的当事人信息，请从下方证据材料原文中提取。'}

---

【案件证据材料原文】
${params.documentsContent}

---

只输出 JSON，不输出任何其他内容。`;

        const response = await aiService.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        let raw = response.text || '{}';
        // 清理 markdown code block
        raw = raw.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();
        // 尝试找到第一个 { 到最后一个 }
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            raw = raw.substring(start, end + 1);
        }

        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error('[TrafficAccidentSkill.generateDocxVariables] JSON parse error:', e);
            console.error('Raw response:', raw.substring(0, 500));
            // 返回空对象让 controller 能检测到错误
            throw new Error('AI 返回的 JSON 格式有误，无法解析。');
        }
    }
}
