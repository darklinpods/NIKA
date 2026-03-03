import mammoth from 'mammoth';
import PDFParser from 'pdf2json';
import { aiService } from './aiService';

export const documentService = {
    async parseDocumentContent(fileBuffer: Buffer, mimeType: string, filename: string): Promise<string> {
        let extractedText = '';

        if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
            const rawPdfText: string = await new Promise((resolve, reject) => {
                const pdfParser = new PDFParser(null, true);
                pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
                pdfParser.on("pdfParser_dataReady", () => {
                    resolve((pdfParser as any).getRawTextContent());
                });
                pdfParser.parseBuffer(fileBuffer);
            });

            // Detect if scanned PDF
            const cleanText = rawPdfText.replace(/[-]+Page \(\d+\) Break[-]+/g, '').trim();

            if (cleanText.length > 50) {
                extractedText = rawPdfText;
                console.log(`[DocumentService] Digital PDF detected. Extracted ${extractedText.length} chars.`);
            } else {
                console.log(`[DocumentService] Scanned PDF detected. Using Gemini OCR...`);
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
                    console.log(`[DocumentService] Gemini OCR extracted ${extractedText.length} chars.`);
                } catch (ocrError: any) {
                    console.error(`[DocumentService] Gemini OCR failed:`, ocrError.message);
                    throw new Error('扫描件 PDF OCR 识别失败，请稍后重试: ' + ocrError.message);
                }
            }
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            filename.endsWith('.docx')
        ) {
            const mammothData = await mammoth.extractRawText({ buffer: fileBuffer });
            extractedText = mammothData.value;
            console.log(`[DocumentService] DOCX detected. Extracted ${extractedText.length} chars.`);
        } else if (mimeType === 'text/plain' || filename.endsWith('.txt')) {
            extractedText = fileBuffer.toString('utf-8');
            console.log(`[DocumentService] TXT detected. Extracted ${extractedText.length} chars.`);
        } else {
            throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
        }

        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('Failed to extract text from the document or the document is empty.');
        }

        return extractedText;
    }
};
