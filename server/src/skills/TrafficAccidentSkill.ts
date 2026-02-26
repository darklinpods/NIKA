import { aiService } from '../services/aiService';
import fs from 'fs';
import path from 'path';

/**
 * 交通事故 Skill：读取 Skill 配置文件 + 案件证据 → AI 生成完整格式化索赔清单与诉状文本
 */
export class TrafficAccidentSkill {

    /**
     * 读取 skills/traffic_accident.md 的内容
     */
    private getSkillContent(): string {
        const skillPath = path.resolve(process.cwd(), '..', 'skills', 'traffic_accident.md');
        if (!fs.existsSync(skillPath)) {
            // 兜底：尝试从项目根目录读取
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
     * 调用 AI，读取 Skill 规则 + 证据原文 → 生成完整的诉状文本（Markdown 格式）
     * 返回的文本已包含：当事人信息、索赔清单（带公式）、事实与理由
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
当事人信息：${params.parties || '暂无'}

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
        // 清理可能的 markdown code block 包裹
        text = text.replace(/^```markdown\n?/i, '').replace(/\n?```$/i, '').trim();
        
        return text;
    }
}
