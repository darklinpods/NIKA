import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { getComplaintElementsExtractionPrompt } from '../prompts/documentPrompts';
import { logExtraction } from '../utils/extractionLogger';
import { cleanAndParseJsonObject } from '../utils/aiJsonParser';
import { TrafficAccidentSkill } from '../skills/TrafficAccidentSkill';

export const extractComplaintElements = async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
        const { text, templateId } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Missing source text' });
        }

        // 交通事故：直接用 skill 生成完整 Markdown 诉状
        if (templateId === 'traffic') {
            const skill = new TrafficAccidentSkill();
            const markdownText = await skill.generateClaimText({
                documentsContent: text,
                caseTitle: '',
                caseDescription: '',
                parties: ''
            });
            logExtraction({ templateId, status: 'success', processingTime: Date.now() - startTime }, text);
            return res.json({ success: true, markdownText });
        }

        const jsonSchemaStr = `{
  "plaintiffs": [
    {
      "name": "原告姓名",
      "gender": "原告性别，仅填男或女",
      "birth": "原告出生日期，格式如1990年12月10日",
      "nation": "原告民族，例如汉族",
      "job": "原告工作单位",
      "position": "原告职务",
      "phone": "原告联系电话",
      "address": "原告住所地（户籍所在地）",
      "residence": "原告经常居住地",
      "idType": "原告证件类型，如身份证",
      "id": "原告证件号码"
    }
  ],
  "defendants": [
    {
      "name": "被告姓名或名称",
      "type": "被告类型：自然人 或 法人/非法人组织",
      "gender": "被告性别（仅自然人）",
      "birth": "被告出生日期（仅自然人）",
      "nation": "被告民族（仅自然人）",
      "job": "被告工作单位",
      "position": "被告职务",
      "phone": "被告联系电话",
      "address": "被告住所地",
      "residence": "被告经常居住地",
      "idType": "证件类型（身份证或统一社会信用代码）",
      "id": "证件号码",
      "regAddress": "法人的注册地/登记地（仅法人）",
      "legalRep": "法人的法定代表人/主要负责人（仅法人）"
    }
  ]` +

  (templateId === 'traffic' ? `,
  "claimsList": "【索赔清单】（具体的费用明细项目，如：医疗费XXX元、误工费XXX元、护理费XXX元等。每项费用单独列出，包含计算公式和金额。绝对不能包含诉讼请求的表述如'请求判令'等）",
  "accidentFacts": "【交通事故发生情况】部分事实与理由",
  "liabilityDetermination": "【交通事故责任认定】部分（如交警认定书上的认定结论）",
  "insuranceStatus": "【机动车投保情况】部分（肇事车辆交强险、商业险分别在哪家保险公司投保等）",
  "otherFacts": "【其他情况及法律依据】（包括伤情、鉴定、具体索赔数额的计算明细或说明等剩余事实。但【绝对禁止】将索赔清单放在这里，上面 claimsList 专属费用明细）"` : `,
  "requestsAndFacts": "完整综合的【诉讼请求】和【事实与理由】段落合并。保持原有的清晰条理和分段。"
}`);

        const aiPrompt = getComplaintElementsExtractionPrompt(text, templateId);

        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
                    text: aiPrompt
                }]
            }]
        });

        // Parse AI response using unified JSON parser
        const parsed = cleanAndParseJsonObject(response.text || '{}');
        const processingTime = Date.now() - startTime;

        if (Object.keys(parsed).length === 0) {
            // 记录失败的提取
            logExtraction({
                templateId,
                status: 'error',
                errorMessage: `JSON解析错误: AI 返回格式有误`,
                processingTime
            }, text);

            res.status(500).json({ error: "Failed to parse extraction result", details: "AI returned malformed JSON" });
        } else {
            // 记录成功的提取
            logExtraction({
                templateId,
                status: 'success',
                processingTime
            }, text, parsed);

            res.json({ success: true, data: parsed });
        }

    } catch (error: any) {
        const processingTime = Date.now() - startTime;

        console.error('[extractComplaintElements] Error:', error);

        // 记录异常错误
        logExtraction({
            status: 'error',
            errorMessage: error.message,
            processingTime
        }, req.body?.text || '');

        res.status(500).json({ error: error.message || 'Failed to extract text.' });
    }
};

