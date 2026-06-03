import prisma from '../prisma';

export const EVIDENCE_DOCUMENT_CATEGORY = 'Evidence';

export type EvidenceDocument = {
    id?: string;
    title: string;
    content: string;
    category?: string;
};

/**
 * 判断给定的文档是否为证据文档
 * @param doc - 待检查的文档对象，包含可选的 category 属性
 * @returns 如果文档的 category 等于 EVIDENCE_DOCUMENT_CATEGORY，则返回 true；否则返回 false
 */
export const isEvidenceDocument = (doc: { category?: string }) =>
    doc.category === EVIDENCE_DOCUMENT_CATEGORY;

/**
 * 获取指定案件的所有证据文档
 * 
 * @param caseId - 案件ID，用于筛选属于该案件的文档
 * @returns 返回按创建时间升序排列的证据文档列表
 */
export const getEvidenceDocuments = (caseId: string) =>
    prisma.caseDocument.findMany({
        // 筛选条件：匹配指定案件ID且类别为证据文档
        where: { caseId, category: EVIDENCE_DOCUMENT_CATEGORY },
        // 按创建时间升序排序
        orderBy: { createdAt: 'asc' },
    });

/**
 * 过滤出属于证据类别的文档列表
 * 
 * @template T - 继承自包含可选 category 属性的对象类型
 * @param docs - 待过滤的文档数组，默认为空数组
 * @returns 过滤后仅包含证据文档的新数组
 */
export const filterEvidenceDocuments = <T extends { category?: string }>(docs: T[] = []) =>
    docs.filter(isEvidenceDocument);

