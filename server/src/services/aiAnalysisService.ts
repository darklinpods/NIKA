import { aiService } from './aiService';
import { knowledgeService } from './knowledgeService';

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

    const prompt = `${kContext}
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

    const prompt = `${kContext}
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
