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
  "plaintiffName": "原告姓名或名称",
  "plaintiffGender": "原告性别，仅填男或女（若原告是公司则留空）",
  "plaintiffBirth": "原告出生日期，格式如1990年12月10日。如果没有则填无",
  "plaintiffNation": "原告民族，例如汉族",
  "plaintiffJob": "原告工作单位",
  "plaintiffPosition": "原告职务",
  "plaintiffPhone": "原告联系电话",
  "plaintiffAddress": "原告住所地（户籍所在地/主要办事机构）",
  "plaintiffResidence": "原告经常居住地",
  "plaintiffIdType": "原告证件类型，如身份证或统一社会信用代码",
  "plaintiffId": "原告证件号码",
  
  "defendantName": "第一被告（自然人）姓名。若只有法人被告，此处留空",
  "defendantGender": "被告性别",
  "defendantBirth": "被告出生日期",
  "defendantNation": "被告民族",
  "defendantJob": "被告工作单位",
  "defendantPosition": "被告职务",
  "defendantPhone": "被告联系电话",
  "defendantAddress": "被告住所地",
  "defendantResidence": "被告经常居住地",
  "defendantIdType": "被告证件类型",
  "defendantId": "被告证件号码",

  "defendant2Name": "第二被告（法人/非法人组织，例如保险公司、有限公司等）。若无留空",
  "defendant2Address": "第二被告住所地",
  "defendant2RegAddress": "第二被告注册地/登记地",
  "defendant2Rep": "第二被告法定代表人/主要负责人",
  "defendant2Position": "第二被告职务",
  "defendant2Phone": "第二被告联系电话",
  "defendant2Id": "第二被告统一社会信用代码",
  "defendant2Type": "类型，如：有限责任公司、股份有限公司等"` +

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
         };

         if (templateId === 'traffic') {
             // We need raw xml support for the claims table
             docOptions.delimiters = { start: '{', end: '}' };
             // The raw xml tag will be {@_CLAIM_ROWS_} since docxtemplater natively uses {@var} for raw xml injection
         }

         const doc = new Docxtemplater(zip, docOptions);

        // -- Add the Custom Table Expansion Logic for Claims List and Plaintiffs --
        if (templateId === 'traffic') {
            // Handle multiple plaintiffs
            if (formData.plaintiffs && Array.isArray(formData.plaintiffs) && formData.plaintiffs.length > 1) {
                let plaintiffRowsXml = '';
                formData.plaintiffs.forEach((plaintiff: any, index: number) => {
                    if (index > 0) { // Skip first plaintiff as it's already in template
                        plaintiffRowsXml += `
                            <w:tr>
                                <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${plaintiff.name || ''}</w:t></w:r></w:p></w:tc>
                                <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${plaintiff.gender || ''}</w:t></w:r></w:p></w:tc>
                                <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${plaintiff.birth || ''}</w:t></w:r></w:p></w:tc>
                                <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${plaintiff.nation || ''}</w:t></w:r></w:p></w:tc>
                                <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${plaintiff.address || ''}</w:t></w:r></w:p></w:tc>
                                <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${plaintiff.idType || ''} ${plaintiff.id || ''}</w:t></w:r></w:p></w:tc>
                            </w:tr>
                        `;
                    }
                });
                formData._PLAINTIFF_ROWS_ = plaintiffRowsXml;
            } else {
                formData._PLAINTIFF_ROWS_ = '';
            }

            // Handle claims list
            if (formData.claimsList && Array.isArray(formData.claimsList)) {
                const claims = formData.claimsList;
                if (claims.length > 0) {
                    let rowsXml = '';
                    claims.forEach((claim: any, index: number) => {
                        // Create a Word table row <w:tr> with style for each claim
                        rowsXml += `
                            <w:tr>
                                <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${index + 1}</w:t></w:r></w:p></w:tc>
                                <w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${claim.category || ''}</w:t></w:r></w:p></w:tc>
                                <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${claim.amount ? Number(claim.amount).toFixed(2) : '0.00'}</w:t></w:r></w:p></w:tc>
                                <w:tc><w:tcPr><w:tcW w:w="3700" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${claim.description || ''}</w:t></w:r></w:p></w:tc>
                            </w:tr>
                        `;
                    });
                    
                    // Provide the raw XML to docxtemplater using raw module logic, or simply pre-replace if template macro exists
                    formData._CLAIM_ROWS_ = rowsXml;
                } else {
                     formData._CLAIM_ROWS_ = '';
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
