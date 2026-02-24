
import { Request, Response } from 'express';
// @ts-ignore
import multer from 'multer';
import { caseService } from '../services/caseService';
import { GoogleGenAI } from '@google/genai';
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * 案件管理的请求控制器 (Controller Layer)
 * 负责接收 Express 传递的 HTTP 请求、提取响应体信息参数、交由业务逻辑层处理并负责标准结构的 JSON / 状态码返回组合。
 */

// 获取案件列表的处理函数
export const getCases = async (req: Request, res: Response) => {
    try {
        const cases = await caseService.getAllCases();
        res.json(cases);
    } catch (error: any) {
        console.error("Fetch Cases Error:", error);
        res.status(500).json({ error: 'Failed to fetch cases', details: error.message, stack: error.stack });
    }
};

// 新建单一案件的处理函数
export const createCase = async (req: Request, res: Response) => {
    try {
        const newCase = await caseService.createCase(req.body);
        res.json(newCase);
    } catch (error: any) {
        console.error("Create Case Error:", error);
        res.status(500).json({ error: 'Failed to create case', details: error.message, stack: error.stack });
    }
};

// 更新单一案件及其伴随的所有关联对象的处理函数
export const updateCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 收到更新请求，案件ID: ${id}`);

    try {
        const updatedCase = await caseService.updateCase(id, req.body);
        console.log(`[${new Date().toISOString()}] 案件ID: ${id} 更新操作完成，耗时: ${Date.now() - startTime}ms`);
        res.json(updatedCase);
    } catch (error: any) {
        console.error("Update Case Error:", error);
        res.status(500).json({ error: 'Failed to update case', details: error.message, stack: error.stack });
    }
};

// 删除案例实体的处理函数
export const deleteCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await caseService.deleteCase(id);
        res.json(result);
    } catch (error: any) {
        console.error("Delete Case Error:", error);
        res.status(500).json({ error: 'Failed to delete case', details: error.message, stack: error.stack });
    }
};

// 批量重排案件的处理函数
export const reorderCases = async (req: Request, res: Response) => {
    try {
        const updates = req.body;
        if (!Array.isArray(updates)) {
            return res.status(400).json({ error: 'Invalid updates format, expected array' });
        }
        await caseService.reorderCases(updates);
        res.json({ success: true });
    } catch (error: any) {
        console.error("Reorder Cases Error:", error);
        res.status(500).json({ error: 'Failed to reorder cases', details: error.message });
    }
};

// 智能导入案件 (PDF/Word解析 + AI信息提取)
export const smartImportCase = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        const filename = req.file.originalname.toLowerCase();

        let extractedText = '';

        console.log(`[Smart Import] Processing file: ${req.file.originalname} (${mimeType})`);

        // 解析文档文本
        if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
            extractedText = await new Promise((resolve, reject) => {
                const pdfParser = new PDFParser(null, true); // true = flag to extract raw text
                pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
                pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
                    resolve((pdfParser as any).getRawTextContent());
                });
                pdfParser.parseBuffer(fileBuffer);
            });
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            filename.endsWith('.docx')
        ) {
            const mammothData = await mammoth.extractRawText({ buffer: fileBuffer });
            extractedText = mammothData.value;
        } else {
            return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or DOCX file.' });
        }

        if (!extractedText || extractedText.trim().length === 0) {
            return res.status(400).json({ error: 'Failed to extract text from the document or the document is empty.' });
        }

        console.log(`[Smart Import] Generated ${extractedText.length} characters of raw text.`);

        // 为了控制 Token 成本，如果文本特别长，只截取前 15000 个字符进行关键信息提取 (通常案由、当事人和事实部分都在前面)
        const textToAnalyze = extractedText.substring(0, 15000);

        const prompt = `
你是一位专业的法律助理，主要负责从案卷材料中提取关键要素以建立案件档案。
请阅读以下案卷材料文本，并提取出核心信息。
必须返回一个极其严格的经过格式化的 JSON 对象，不要包含任何 \`\`\`json\`\`\` 等 Markdown 引用符号。

JSON 格式要求如下：
{
  "title": "简短的案件标题，如'张三诉李四借款合同纠纷案'或'XX公司劳动争议'",
  "clientName": "根据文书判断，我们的客户(当事人)是谁？如果不确定，填文本中出现的第一原告/委托人",
  "description": "用150-300字精炼总结案件的核心事实、争议焦点或诉求",
  "priority": "low" | "medium" | "high" (判断紧迫程度，如有近期开庭、金额巨大或涉及刑事风险选high，普通欠款选medium，例行审查选low),
  "tags": ["标签1", "标签2", "标签3"] (提炼3-5个简短的法律标签属性，如"合同纠纷", "民间借贷", "财产保全")
}

待提取的案卷文稿文本如下：
----------------
${textToAnalyze}
----------------
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                // @ts-ignore
                responseMimeType: "application/json",
            }
        });

        const rawResult = response.text;
        if (!rawResult) {
            throw new Error("AI returned empty response");
        }

        console.log(`[Smart Import] AI Response raw: ${rawResult.substring(0, 100)}...`);

        // 因为 config 中已经要求了 JSON 返回，但为防万一还是做一层简单清理
        const cleanJsonStr = rawResult.replace(/^[^{]*{/, '{').replace(/}[^}]*$/, '}');
        const caseData = JSON.parse(cleanJsonStr);

        res.json({
            success: true,
            data: caseData
        });

    } catch (error: any) {
        console.error("Smart Import Case Error:", error);
        res.status(500).json({ error: 'Failed to smart import case', details: error.message });
    }
};
