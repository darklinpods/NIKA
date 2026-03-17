export interface CaseTypeOption {
    value: string;
    label: string;
}

export const CASE_TYPES: CaseTypeOption[] = [
    { value: 'general', label: '一般案件' },
    { value: 'traffic_accident', label: '机动车交通事故责任纠纷' },
    { value: 'loan_dispute', label: '民间借贷' },
    { value: 'unjust_enrichment', label: '不当得利' },
    { value: 'sales_contract', label: '买卖合同纠纷' },
    { value: 'labor_contract', label: '劳务合同纠纷' },
    { value: 'divorce', label: '离婚' },
];

export const getCaseTypeLabel = (value: string): string => {
    const found = CASE_TYPES.find(ct => ct.value === value);
    return found ? found.label : '一般案件';
};
