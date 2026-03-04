export interface CaseTypeOption {
    value: string;
    labelZh: string;
    labelEn: string;
}
import { translations } from '../translations';

export const CASE_TYPES: CaseTypeOption[] = [
    { value: 'general', labelZh: '一般案件', labelEn: 'General' },
    { value: 'traffic_accident', labelZh: '机动车交通事故责任纠纷', labelEn: 'Motor Vehicle Traffic Accident' },
    { value: 'loan_dispute', labelZh: '民间借贷', labelEn: 'Private Lending' },
    { value: 'unjust_enrichment', labelZh: '不当得利', labelEn: 'Unjust Enrichment' },
    { value: 'sales_contract', labelZh: '买卖合同纠纷', labelEn: 'Sales Contract Dispute' },
    { value: 'labor_contract', labelZh: '劳务合同纠纷', labelEn: 'Labor Contract Dispute' },
    { value: 'divorce', labelZh: '离婚', labelEn: 'Divorce' },
];

export const getCaseTypeLabel = (value: string, lang: 'zh' | 'en'): string => {
    const t = (translations[lang] as any) || (translations['en'] as any);
    const found = CASE_TYPES.find(ct => ct.value === value);
    if (!found) return t.caseTypeGeneral;
    return lang === 'zh' ? found.labelZh : found.labelEn;
};
