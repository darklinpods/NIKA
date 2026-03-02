
import { Request, Response } from 'express';
// @ts-ignore
import multer from 'multer';
import { caseService } from '../services/caseService';
import { aiService } from '../services/aiService';
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

// Multer 默认将 filename 按 Latin-1 解码，对于 UTF-8 编码的中文文件名会产生乱码。
// 此辅助函数将 Latin-1 字符串重新编码为 UTF-8。
function fixFilename(name: string): string {
    try {
        return Buffer.from(name, 'latin1').toString('utf8');
    } catch {
        return name;
    }
}

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
        const originalName = fixFilename(req.file.originalname);
        const filename = originalName.toLowerCase();

        let extractedText = '';

        console.log(`[Smart Import] Processing file: ${originalName} (${mimeType})`);

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

        const response = await aiService.generateContent({
            model: 'gemini-2.5-flash',
            // 修复：Gemini API 要求 contents 参数必须是特定结构的对象数组，
            // 这里将非 PDF 的纯文本请求也统一包装成了 [{ role: 'user', parts: [{ text: prompt }] }] 格式以解决报错。
            contents: mimeType === 'application/pdf'
                ? [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'application/pdf' } }] }]
                : [{ role: 'user', parts: [{ text: prompt }] }]
        });

        let rawResult = response.text;
        if (!rawResult) {
            throw new Error("AI returned empty response");
        }
        rawResult = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();

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

// 上传并解析现有案件的证据文档 (保存 RAG 来源文档 & 提取当事人详情)
export const uploadEvidence = async (req: Request, res: Response) => {
    try {
        const { id: caseId } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        const originalName = fixFilename(req.file.originalname);
        const filename = originalName.toLowerCase();

        let extractedText = '';

        console.log(`[Evidence Import] Processing file: ${originalName} (${mimeType}) for case: ${caseId}`);

        // 验证案件是否已存在于数据库。如果前端在用户保存之前就上传了证据（使用临时ID如 task-xxx），
        // 则需要先自动创建该案件记录，以避免外键约束违规 (P2003)。
        const existingCase = await caseService.getCaseById(caseId);
        if (!existingCase) {
            console.log(`[Evidence Import] Case ${caseId} not found in DB. Auto-creating...`);
            // 修复：当从案件详情上传证据时如果案件尚未真正创建（例如使用临时任务ID），会自动初始化案件。
            // 在此补充 description: '' 空字符串字段，防止因数据库 schema 对 description 的非空要求导致创建失败。
            await caseService.updateCase(caseId, {
                title: '待完善案件（证据先行导入）',
                description: '',
                status: 'todo',
                priority: 'medium',
            });
        }

        // 解析文档文本
        if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
            // 第一步：尝试使用 pdf2json 提取数字化 PDF 的文本
            const rawPdfText: string = await new Promise((resolve, reject) => {
                const pdfParser = new PDFParser(null, true);
                pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
                pdfParser.on("pdfParser_dataReady", () => {
                    resolve((pdfParser as any).getRawTextContent());
                });
                pdfParser.parseBuffer(fileBuffer);
            });

            // 检测是否为扫描件：去除 Page Break 标记后检查剩余内容长度
            const cleanText = rawPdfText.replace(/[-]+Page \(\d+\) Break[-]+/g, '').trim();

            if (cleanText.length > 50) {
                // 数字化 PDF，直接使用提取的文本
                extractedText = rawPdfText;
                console.log(`[Evidence Import] Digital PDF detected. Extracted ${extractedText.length} chars via pdf2json.`);
            } else {
                // 扫描件 PDF，使用 Gemini 多模态 OCR 识别
                console.log(`[Evidence Import] Scanned PDF detected (only ${cleanText.length} chars from pdf2json). Using Gemini multimodal OCR...`);

                try {
                    const ocrResponse = await aiService.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: [{
                            role: 'user',
                            parts: [
                                { text: '请将这份 PDF 文档中的所有文字内容完整地、逐字逐句地提取出来。保持原始排版格式（如标题、段落、表格等）。只输出文档原文，不要添加任何总结、分析或额外的说明。如果文档包含表格，请用文字形式呈现表格内容。' },
                                { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'application/pdf' } }
                            ]
                        }]
                    });

                    extractedText = ocrResponse.text || '';
                    console.log(`[Evidence Import] Gemini OCR extracted ${extractedText.length} chars.`);
                } catch (ocrError: any) {
                    console.error(`[Evidence Import] Gemini OCR failed:`, ocrError.message);
                    return res.status(500).json({ error: '扫描件 PDF OCR 识别失败，请稍后重试', details: ocrError.message });
                }
            }
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            filename.endsWith('.docx')
        ) {
            const mammothData = await mammoth.extractRawText({ buffer: fileBuffer });
            extractedText = mammothData.value;
        } else if (mimeType === 'text/plain' || filename.endsWith('.txt')) {
            extractedText = fileBuffer.toString('utf-8');
        } else {
            return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' });
        }

        if (!extractedText || extractedText.trim().length === 0) {
            return res.status(400).json({ error: 'Failed to extract text from the document.' });
        }

        // 保存原文本作为 CaseDocument 供后续 RAG 使用
        await caseService.addDocument(caseId, {
            title: originalName,
            content: extractedText,
            category: "Evidence"
        });

        // 取前 15000 字符用于提取当事人。通常当事人信息都在文首。
        const textToAnalyze = extractedText.substring(0, 15000);

        const prompt = `
请作为专业的法律助理，从以下法律案卷文稿中仔细提取所有涉及的当事人（包括原告、被告、第三人、上诉人、被上诉人等，或者是协议的甲方乙方）的详细信息。
如果没有提取到任何特定信息，可以在该字段留空。必须返回一个严格的 JSON 对象。

JSON 格式要求如下：
{
  "extractedParties": [
    {
      "name": "当事人姓名或公司名称",
      "role": "案件角色（如：原告、被告、甲方、乙方、委托人等）",
      "idNumber": "身份证号或统一社会信用代码等证件号码（如果有的话）",
      "address": "住所地、联系地址（如果有的话）",
      "contact": "联系电话或法定代表人信息（如果有的话）"
    }
  ]
}

待提取的案卷文稿文本如下：
----------------
${textToAnalyze}
----------------
        `;

        const response = await aiService.generateContent({
            model: 'gemini-2.5-flash',
            // 修复：此处的 Gemini 请求用于分析提取当事人信息，同样需要包装为统一的对象数组格式，解决传入纯字符串导致的 API 错误
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        let rawResult = response.text;
        if (!rawResult) {
            throw new Error("AI returned empty response");
        }

        rawResult = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();

        const cleanJsonStr = rawResult.replace(/^[^{]*{/, '{').replace(/}[^}]*$/, '}');
        const extractedData = JSON.parse(cleanJsonStr);

        // 获取当前 Case，以便合并 parties
        const currentCase = await caseService.getCaseById(caseId);
        if (!currentCase) {
            return res.status(404).json({ error: 'Case not found' });
        }

        let existingParties: any[] = [];
        if ((currentCase as any).parties) {
            try {
                existingParties = JSON.parse((currentCase as any).parties);
            } catch (e) {
                console.error("Failed to parse existing parties", e);
            }
        }

        const newParties = extractedData.extractedParties || [];
        // 简单合并逻辑：基于姓名去重（如果有更复杂的场景可能需要进一步处理）
        const combinedParties = [...existingParties];
        for (const np of newParties) {
            const exists = combinedParties.find(p => p.name === np.name);
            if (!exists) {
                combinedParties.push(np);
            }
            // (Optional) If it exists, we could merge fields if they were missing before
        }

        // 更新数据库
        const updatedCase = await caseService.updateCase(caseId, {
            ...currentCase,
            parties: JSON.stringify(combinedParties)
        } as any);

        res.json({
            success: true,
            data: updatedCase,
            importedParties: newParties
        });

    } catch (error: any) {
        console.error("Upload Evidence Error:", error);
        res.status(500).json({ error: 'Failed to upload and parse evidence', details: error.message });
    }
};
