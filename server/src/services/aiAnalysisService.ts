import { aiService } from './aiService';
import { DEFAULT_MODEL } from '../constants';
import { knowledgeService } from './knowledgeService';
import { getCaseDataExtractionPrompt, getPartiesExtractionPrompt, getDocumentClassificationPrompt } from '../prompts/analysisPrompts';
import { buildKnowledgeContextZh } from '../utils/knowledgeContextBuilder';
import { cleanAndParseJsonObject } from '../utils/aiJsonParser';

export const aiAnalysisService = {
  /**
   * 从文档文本（或 PDF 原文件）中提取案件基础信息（标题、描述、优先级、标签、委托人等）。
   * PDF 文件会以 inlineData 方式直接传给 Gemini 进行原生解析。
   */
  async extractCaseData(textToAnalyze: string, isPdfStr: boolean, fileBuffer?: Buffer): Promise<any> {
    const kDocs = await knowledgeService.getAllDocuments();
    const kContext = buildKnowledgeContextZh(kDocs || []);

    const prompt = getCaseDataExtractionPrompt(kContext, textToAnalyze);

    const contents = isPdfStr && fileBuffer
      ? [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'application/pdf' } }] }]
      : [{ role: 'user', parts: [{ text: prompt }] }];

    const response = await aiService.generateContent({ model: DEFAULT_MODEL, contents });
    return cleanAndParseJsonObject(response.text || '{}');
  },

  /** 从文档文本中提取当事人列表，返回 extractedParties 数组 */
  async extractParties(textToAnalyze: string): Promise<any[]> {
    const kDocs = await knowledgeService.getAllDocuments();
    const kContext = buildKnowledgeContextZh(kDocs || [], '【系统全局经验库】', '');

    const prompt = getPartiesExtractionPrompt(kContext, textToAnalyze);

    const response = await aiService.generateContent({
      model: DEFAULT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const data = cleanAndParseJsonObject(response.text || '{}');
    return data.extractedParties || [];
  }
};
