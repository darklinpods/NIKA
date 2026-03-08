import { aiService } from './aiService';
import { knowledgeService } from './knowledgeService';
import { getCaseDataExtractionPrompt, getPartiesExtractionPrompt, getDocumentClassificationPrompt } from '../prompts/analysisPrompts';

export const aiAnalysisService = {
  async extractCaseData(textToAnalyze: string, isPdfStr: boolean, fileBuffer?: Buffer): Promise<any> {
    const kDocs = await knowledgeService.getAllDocuments();
    let kContext = '';

    if (kDocs && kDocs.length > 0) {
      const cats: Record<string, string> = {
        'pleading': '原创诉状参考',
        'precedent': '法院判例参考',
        'provision': '法律法规依据',
        'notebook_lm': '办案笔记/逻辑'
      };

      const grouped = kDocs.reduce((acc: any, doc: any) => {
        const catName = cats[doc.category] || '其他经验';
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(`文档标题: ${doc.title}\n内容详情: ${doc.content}`);
        return acc;
      }, {});

      kContext = "【系统全局经验库/办案指南】\n";
      for (const [cat, items] of Object.entries(grouped)) {
        kContext += `### ${cat} ###\n${(items as string[]).join('\n\n')}\n\n`;
      }
      kContext += "【提示】：请充分结合以上经验库中的内容（尤其是诉状风格、判例标准和法律依据）来处理当前案件。\n\n";
    }

    const prompt = getCaseDataExtractionPrompt(kContext, textToAnalyze);

    const contents = isPdfStr && fileBuffer
      ? [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'application/pdf' } }] }]
      : [{ role: 'user', parts: [{ text: prompt }] }];

    const response = await aiService.generateContent({ model: 'gemini-2.5-flash', contents });
    let rawResult = response.text || '';

    rawResult = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const cleanJsonStr = rawResult.replace(/^[^{]*{/, '{').replace(/}[^}]*$/, '}');
    return JSON.parse(cleanJsonStr);
  },

  async extractParties(textToAnalyze: string): Promise<any[]> {
    const kDocs = await knowledgeService.getAllDocuments();
    let kContext = '';
    if (kDocs && kDocs.length > 0) {
      const cats: Record<string, string> = {
        'pleading': '原创诉状参考',
        'precedent': '法院判例参考',
        'provision': '法律法规依据',
        'notebook_lm': '办案笔记/逻辑'
      };
      const grouped = kDocs.reduce((acc: any, doc: any) => {
        const catName = cats[doc.category] || '其他经验';
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(`文档标题: ${doc.title}\n内容详情: ${doc.content}`);
        return acc;
      }, {});

      kContext = "【系统全局经验库】\n";
      for (const [cat, items] of Object.entries(grouped)) {
        kContext += `### ${cat} ###\n${(items as string[]).join('\n\n')}\n\n`;
      }
    }

    const prompt = getPartiesExtractionPrompt(kContext, textToAnalyze);

    const response = await aiService.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    let rawResult = response.text || '';
    rawResult = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const cleanJsonStr = rawResult.replace(/^[^{]*{/, '{').replace(/}[^}]*$/, '}');

    try {
      const data = JSON.parse(cleanJsonStr);
      return data.extractedParties || [];
    } catch (e) {
      console.error("AI returned malformed JSON parties data", e);
      throw e;
    }
  }
};
