import { aiService } from './aiService';
import { knowledgeService } from './knowledgeService';
import { getCaseDataExtractionPrompt, getPartiesExtractionPrompt, getDocumentClassificationPrompt } from '../prompts/analysisPrompts';
import { buildKnowledgeContextZh } from '../utils/knowledgeContextBuilder';
import { cleanAndParseJsonObject } from '../utils/aiJsonParser';

export const aiAnalysisService = {
  async extractCaseData(textToAnalyze: string, isPdfStr: boolean, fileBuffer?: Buffer): Promise<any> {
    const kDocs = await knowledgeService.getAllDocuments();
    const kContext = buildKnowledgeContextZh(kDocs || []);

    const prompt = getCaseDataExtractionPrompt(kContext, textToAnalyze);

    const contents = isPdfStr && fileBuffer
      ? [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'application/pdf' } }] }]
      : [{ role: 'user', parts: [{ text: prompt }] }];

    const response = await aiService.generateContent({ model: 'gemini-2.5-flash', contents });
    return cleanAndParseJsonObject(response.text || '{}');
  },

  async extractParties(textToAnalyze: string): Promise<any[]> {
    const kDocs = await knowledgeService.getAllDocuments();
    const kContext = buildKnowledgeContextZh(kDocs || [], '【系统全局经验库】', '');

    const prompt = getPartiesExtractionPrompt(kContext, textToAnalyze);

    const response = await aiService.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const data = cleanAndParseJsonObject(response.text || '{}');
    return data.extractedParties || [];
  }
};
