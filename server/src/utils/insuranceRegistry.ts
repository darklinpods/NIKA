import fs from 'fs';
import path from 'path';

export interface InsuranceCompany {
    name: string;
    short_name: string[];
    address: string;
    legal_representative: string;
    credit_code: string;
}

let cachedData: InsuranceCompany[] | null = null;

/**
 * 加载保险公司主体信息登记表
 * 诉状生成时，若被告中出现保险公司且匹配此表中的记录，则直接使用登记表中的
 * 全称、住所地、法定代表人、统一社会信用代码，不依赖 AI 推测。
 */
export function loadInsuranceCompanies(): InsuranceCompany[] {
    if (cachedData) return cachedData;

    const filePath = path.resolve(__dirname, '../data/insuranceCompanies.json');
    if (!fs.existsSync(filePath)) {
        console.warn('[InsuranceRegistry] 保险公司登记表不存在:', filePath);
        return [];
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        cachedData = JSON.parse(raw) as InsuranceCompany[];
        return cachedData;
    } catch (e: any) {
        console.error('[InsuranceRegistry] 加载保险公司登记表失败:', e.message);
        return [];
    }
}

/**
 * 将保险公司登记表格式化为可嵌入 AI prompt 的文本段落
 */
export function formatInsuranceRegistryForPrompt(): string {
    const companies = loadInsuranceCompanies();
    if (!companies.length) return '';

    const lines = companies.map(c =>
        `- ${c.name}（简称：${c.short_name.join('/')}）\n` +
        `  住所地：${c.address}\n` +
        `  法定代表人/负责人：${c.legal_representative}\n` +
        `  统一社会信用代码：${c.credit_code}`
    );

    return `【保险公司主体信息登记表】
以下是已核实的保险公司法人主体信息。起诉时，若被告中出现保险公司且名称或简称匹配以下任一条目，
则**必须**使用该条目中的全称、住所地、法定代表人、统一社会信用代码来填写被告信息，不得自行编造或省略。

${lines.join('\n\n')}`;
}
