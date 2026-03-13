import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import PizZip from 'pizzip';
import path from 'path';
import fs from 'fs';
import { getComplaintElementsExtractionPrompt } from '../prompts/documentPrompts';
import { logExtraction } from '../utils/extractionLogger';

// docxtemplater is CJS
const Docxtemplater = require('docxtemplater');

export const extractComplaintElements = async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
        const { text, templateId } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Missing source text' });
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

        let dataStr = response.text || '{}';
        
        // Multiple cleanup strategies
        // 1. Remove markdown code blocks
        dataStr = dataStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        
        // 2. Try to extract JSON object if wrapped in text
        const jsonMatch = dataStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            dataStr = jsonMatch[0];
        }
        
        // 3. Remove any leading/trailing whitespace or non-JSON characters
        dataStr = dataStr.trim();
        
        try {
            const parsed = JSON.parse(dataStr);
            const processingTime = Date.now() - startTime;
            
            // 记录成功的提取
            logExtraction({
                templateId,
                status: 'success',
                processingTime
            }, text, parsed);
            
            res.json({ success: true, data: parsed });
        } catch (e: any) {
            const processingTime = Date.now() - startTime;
            
            console.error("Failed to parse gemini JSON. Error:", e.message);
            console.error("Raw response text:", response.text);
            console.error("Cleaned text:", dataStr);
            
            // 记录失败的提取
            logExtraction({
                templateId,
                status: 'error',
                errorMessage: `JSON解析错误: ${e.message}`,
                processingTime
            }, text);
            
            res.status(500).json({ error: "Failed to parse extraction result", details: e.message });
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

function getTemplateFileName(templateId: string): string {
    const map: Record<string, string> = {
        'traffic': '民事起诉状（机动车交通事故责任纠纷）.docx',
        'loan': '民事起诉状（民间借贷纠纷）.docx',
        'labor': '民事起诉状（劳动争议纠纷）.docx',
        'contract_buy': '民事起诉状（买卖合同纠纷）.docx',
        'divorce': '民事起诉状（离婚纠纷）.docx',
        'card': '民事起诉状（信用卡纠纷）.docx',
    };
    return map[templateId] || map['traffic'];
}

export const getTemplateFile = async (req: Request, res: Response) => {
    try {
        const { templateId } = req.query;
        
        if (!templateId || typeof templateId !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid templateId' });
        }

        const templateFileName = getTemplateFileName(templateId);
        
        // Find the template file
        const candidates = [
            path.resolve(process.cwd(), 'src/templates/docx', templateFileName),
            path.resolve(__dirname, '..', '..', 'src/templates/docx', templateFileName),
            path.resolve(__dirname, '..', 'templates', 'docx', templateFileName),
        ];
        
        let templatePath = '';
        for (const p of candidates) {
            if (fs.existsSync(p)) {
                templatePath = p;
                break;
            }
        }
        
        if (!templatePath) {
            console.error("Template not found in candidates:", candidates);
            return res.status(404).json({ error: `模板文件未找到: ${templateFileName}` });
        }
        
        // Send file for download
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(templateFileName)}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.sendFile(templatePath);
        
    } catch (error: any) {
        console.error('[getTemplateFile] Error:', error);
        res.status(500).json({ error: error.message || 'Failed to get template file.' });
    }
};

export const generateComplaintDocx = async (req: Request, res: Response) => {
    try {
        const { formData, templateId } = req.body;
        
        if (!formData || !templateId) {
            return res.status(400).json({ error: 'Missing formData or templateId' });
        }

        const templateFileName = getTemplateFileName(templateId);
        
        // Find the accurate path.
        const candidates = [
            path.resolve(process.cwd(), 'src/templates/docx', templateFileName),
            path.resolve(__dirname, '..', '..', 'src/templates/docx', templateFileName),
            path.resolve(__dirname, '..', 'templates', 'docx', templateFileName),
        ];
        
        let templatePath = '';
        for (const p of candidates) {
            if (fs.existsSync(p)) {
                templatePath = p;
                break;
            }
        }
        
        console.log("Using template: ", templatePath);

        if (!templatePath) {
             console.error("Template not found in candidates:", candidates);
             return res.status(404).json({ error: `模板文件未找到: ${templateFileName}` });
        }

        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);

         const docOptions: any = {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => "", // Return empty string for undefined variables
            delimiters: { start: '{', end: '}' } // MUST set single braces for this template!
         };

         const doc = new Docxtemplater(zip, docOptions);
         
         // Add rawModule for handling {@_PLAINTIFF_ROWS_} and {@_CLAIM_ROWS_} raw XML injection
         // Natively handled in docxtemplater v3 using {@var} syntax

        // -- Prepare data for Word template rendering --
        if (templateId === 'traffic') {
            // Extract first plaintiff for main form fields
            if (formData.plaintiffs && Array.isArray(formData.plaintiffs) && formData.plaintiffs.length > 0) {
                const firstPlaintiff = formData.plaintiffs[0];
                formData.plaintiffName = firstPlaintiff.name || '';
                formData.plaintiffGender = firstPlaintiff.gender || '';
                formData.plaintiffBirth = firstPlaintiff.birth || '';
                formData.plaintiffNation = firstPlaintiff.nation || '';
                formData.plaintiffJob = firstPlaintiff.job || '';
                formData.plaintiffPosition = firstPlaintiff.position || '';
                formData.plaintiffPhone = firstPlaintiff.phone || '';
                formData.plaintiffAddress = firstPlaintiff.address || '';
                formData.plaintiffResidence = firstPlaintiff.residence || '';
                formData.plaintiffIdType = firstPlaintiff.idType || '';
                formData.plaintiffId = firstPlaintiff.id || '';
            }
            
            // Extract first defendant for main form fields (backward compatibility)
            if (formData.defendants && Array.isArray(formData.defendants) && formData.defendants.length > 0) {
                const firstDefendant = formData.defendants[0];
                formData.defendantName = firstDefendant.name || '';
                formData.defendantGender = firstDefendant.gender || '';
                formData.defendantBirth = firstDefendant.birth || '';
                formData.defendantNation = firstDefendant.nation || '';
                formData.defendantJob = firstDefendant.job || '';
                formData.defendantPosition = firstDefendant.position || '';
                formData.defendantPhone = firstDefendant.phone || '';
                formData.defendantAddress = firstDefendant.address || '';
                formData.defendantResidence = firstDefendant.residence || '';
                formData.defendantIdType = firstDefendant.idType || '';
                formData.defendantId = firstDefendant.id || '';
            }            // Handle claims list
            if (formData.claimsList) {
                let claims = formData.claimsList;
                if (typeof claims === 'string') {
                    // Try to parse it if it looks like JSON array, otherwise treat as single text description backward compatibility
                    try {
                        claims = JSON.parse(claims);
                    } catch (e) {
                         // It's just a raw text string, split by newline or keep as string
                         formData.claimsList_text = claims; // fallback field for template
                         claims = [];
                    }
                }
                
                if (Array.isArray(claims) && claims.length > 0) {
                     formData.claims = claims;
                }
            }
        }

        // 绑定数据渲染
        doc.render(formData);

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        const safeFileName = `${formData.plaintiffName || '生成'}_要素式起诉状_${Date.now()}.docx`;

        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName)}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Length', buf.length);
        res.send(buf);

    } catch (error: any) {
        console.error('[generateComplaintDocx] Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate Word document.' });
    }
};

export const listTemplates = async (req: Request, res: Response) => {
    try {
        const templatesDir = path.resolve(__dirname, '..', 'templates', 'docx');
        const altTemplatesDir = path.resolve(process.cwd(), 'src/templates/docx');
        
        let targetDir = '';
        if (fs.existsSync(altTemplatesDir)) {
            targetDir = altTemplatesDir;
        } else if (fs.existsSync(templatesDir)) {
            targetDir = templatesDir;
        }
        
        if (!targetDir) {
            return res.status(404).json({ error: '模板目录未找到' });
        }
        
        const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.docx'));
        res.json({ success: true, templates: files });
        
    } catch (error: any) {
        console.error('[listTemplates] Error:', error);
        res.status(500).json({ error: error.message || 'Failed to list templates.' });
    }
};
