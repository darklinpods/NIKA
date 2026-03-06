/**
 * documentService — 文档解析服务
 *
 * 负责将用户上传的各种格式文件（PDF / DOCX / TXT）解析为纯文字字符串，
 * 供后续 AI 分析模块（如当事人提取、案件事实生成）使用。
 *
 * 支持的文件类型：
 *   - PDF（数字版：直接提取文字；扫描版：调用 Gemini Vision OCR）
 *   - DOCX（使用 mammoth 库提取原始文字）
 *   - TXT（直接按 UTF-8 编码读取）
 */
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';
import { aiService } from './aiService';

export const documentService = {
    /**
     * parseDocumentContent — 通用文档解析入口
     *
     * @param fileBuffer  - 文件的二进制 Buffer（由 multer 中间件读取后传入）
     * @param mimeType    - 文件的 MIME 类型字符串，例如 'application/pdf'
     * @param filename    - 文件原始名称，用于在 mimeType 缺失时通过扩展名进行兜底判断
     * @returns           - 解析后的纯文字字符串
     *
     * 整体流程：
     *   1. 根据 mimeType 或文件扩展名判断文件格式
     *   2. 针对不同格式调用对应的解析逻辑
     *   3. 对扫描版 PDF 额外触发 Gemini Vision OCR
     *   4. 若提取结果为空，抛出错误
     */
    async parseDocumentContent(fileBuffer: Buffer, mimeType: string, filename: string): Promise<string> {
        // 最终提取到的文字内容，初始为空字符串
        let extractedText = '';

        // ─── 分支一：PDF 文件处理 ─────────────────────────────────────────────
        if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {

            // 使用 pdf2json 库尝试从 PDF Buffer 中提取文字
            // PDFParser(null, true) 的第二个参数 true 表示以 "原始文本模式" 运行（不解析 JSON 结构）
            const rawPdfText: string = await new Promise((resolve, reject) => {
                const pdfParser = new PDFParser(null, true);

                // 监听解析错误事件，遇错时以错误信息 reject Promise
                pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));

                // 监听解析完成事件，通过 getRawTextContent() 获取拼接好的纯文字
                pdfParser.on("pdfParser_dataReady", () => {
                    resolve((pdfParser as any).getRawTextContent());
                });

                // 开始解析二进制 Buffer
                pdfParser.parseBuffer(fileBuffer);
            });

            // 将 pdf2json 自动插入的分页标记（如 "--------Page (1) Break--------"）去除，
            // 并对剩余内容去除首尾空白，以便判断是否抽取到有效文字
            const cleanText = rawPdfText.replace(/[-]+Page \(\d+\) Break[-]+/g, '').trim();

            if (cleanText.length > 50) {
                // ── 数字版 PDF（文字可直接提取）──────────────────────────────
                // cleanText 超过 50 字符，认定为包含可编辑文本的数字版 PDF，直接使用提取结果
                extractedText = rawPdfText;
                console.log(`[DocumentService] Digital PDF detected. Extracted ${extractedText.length} chars.`);
            } else {
                // ── 扫描版 PDF（纯图片，需走 OCR 识别）─────────────────────
                // cleanText 几乎为空，说明 PDF 内容是扫描图片，无法直接提取文字
                // 此时将 PDF 原始二进制以 Base64 编码后，通过多模态 Gemini 模型进行 OCR 识别
                console.log(`[DocumentService] Scanned PDF detected. Using Gemini OCR...`);
                try {
                    const ocrResponse = await aiService.generateContent({
                        model: 'gemini-2.5-flash', // 支持视觉输入的模型
                        contents: [{
                            role: 'user',
                            parts: [
                                // 系统指令：要求模型逐字逐句提取 PDF 中的文字，保留排版，不做总结
                                { text: '请将这份 PDF 文档中的所有文字内容完整地、逐字逐句地提取出来。保持原始排版格式（如标题、段落、表格等）。只输出文档原文，不要添加任何总结、分析或额外的说明。如果文档包含表格，请用文字形式呈现表格内容,提取的段落内容之间要换行' },
                                // 以 inlineData 形式传入 PDF 的 Base64 编码内容
                                { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'application/pdf' } }
                            ]
                        }]
                    });
                    extractedText = ocrResponse.text || '';
                    console.log(`[DocumentService] Gemini OCR extracted ${extractedText.length} chars.`);
                } catch (ocrError: any) {
                    // OCR 失败时记录错误日志并向上抛出友好的中文错误信息
                    console.error(`[DocumentService] Gemini OCR failed:`, ocrError.message);
                    throw new Error('扫描件 PDF OCR 识别失败，请稍后重试: ' + ocrError.message);
                }
            }

            // ─── 分支二：DOCX 文件处理 ───────────────────────────────────────────
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            filename.endsWith('.docx')
        ) {
            // 使用 mammoth 库从 DOCX Buffer 中提取原始纯文字（不含样式）
            const mammothData = await mammoth.extractRawText({ buffer: fileBuffer });
            extractedText = mammothData.value;
            console.log(`[DocumentService] DOCX detected. Extracted ${extractedText.length} chars.`);

            // ─── 分支三：TXT 纯文本文件处理 ─────────────────────────────────────
        } else if (mimeType === 'text/plain' || filename.endsWith('.txt')) {
            // TXT 文件直接按 UTF-8 编码将 Buffer 转为字符串
            extractedText = fileBuffer.toString('utf-8');
            console.log(`[DocumentService] TXT detected. Extracted ${extractedText.length} chars.`);

            // ─── 分支四：不支持的文件类型 ────────────────────────────────────────
        } else {
            // 上传了不支持的文件格式，直接抛出错误，由上层 Controller 返回 400 响应
            throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
        }

        // ─── 最终校验：确保文字提取结果不为空 ──────────────────────────────
        // 若提取到的内容为空字符串或纯空白，抛出错误（可能是空文档或解析异常）
        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('Failed to extract text from the document or the document is empty.');
        }

        // 返回完整的纯文字字符串供后续处理
        return extractedText;
    }
};
