/**
 * 知识库上下文构建工具
 * 
 * 将知识库文档按类别分组，生成格式化的上下文字符串，
 * 供各 AI 提示词使用。消除 aiTaskService / aiAnalysisService 中的重复逻辑。
 */

export interface KnowledgeDocument {
    title: string;
    content: string;
    category: string;
}

/** 中文类别标签（用于 aiAnalysisService 等中文场景） */
export const CATEGORY_LABELS_ZH: Record<string, string> = {
    'pleading': '原创诉状参考',
    'precedent': '法院判例参考',
    'provision': '法律法规依据',
    'notebook_lm': '办案笔记/逻辑',
};

/** 英文类别标签（用于 aiTaskService 等英文场景） */
export const CATEGORY_LABELS_EN: Record<string, string> = {
    'pleading': 'Original Pleadings/Drafts',
    'precedent': 'Court Precedents',
    'provision': 'Legal Provisions',
    'notebook_lm': 'Logic & Notes',
};

/**
 * 将知识库文档按类别分组并拼接为格式化上下文字符串
 * 
 * @param docs - 知识库文档数组
 * @param categoryLabels - 类别值到显示标签的映射
 * @param defaultCategory - 未匹配类别的默认标签
 * @param header - 上下文开头文本
 * @param footer - 上下文结尾文本
 */
export function buildKnowledgeContext(
    docs: KnowledgeDocument[],
    categoryLabels: Record<string, string>,
    defaultCategory: string = 'General',
    header: string = '',
    footer: string = ''
): string {
    if (!docs || docs.length === 0) return '';

    const grouped = docs.reduce((acc: Record<string, string[]>, doc) => {
        const catName = categoryLabels[doc.category] || defaultCategory;
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(`Title: ${doc.title}\nContent: ${doc.content}`);
        return acc;
    }, {});

    let context = header ? `${header}\n` : '';
    for (const [cat, items] of Object.entries(grouped)) {
        context += `### ${cat} ###\n${items.join('\n\n')}\n\n`;
    }
    if (footer) context += `${footer}\n`;

    return context;
}

/**
 * 构建中文格式的知识库上下文（用于 aiAnalysisService）
 */
export function buildKnowledgeContextZh(
    docs: KnowledgeDocument[],
    header: string = '【系统全局经验库/办案指南】',
    footer: string = '【提示】：请充分结合以上经验库中的内容（尤其是诉状风格、判例标准和法律依据）来处理当前案件。'
): string {
    const zhLabels: Record<string, string> = {
        'pleading': '原创诉状参考',
        'precedent': '法院判例参考',
        'provision': '法律法规依据',
        'notebook_lm': '办案笔记/逻辑',
    };
    return buildKnowledgeContext(docs, zhLabels, '其他经验', header, footer);
}
