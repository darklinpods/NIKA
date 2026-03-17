/**
 * 所有支持案由的枚举（须与前端 constants/caseTypes.ts 同步）
 */
export const SUPPORTED_CASE_TYPES = [
    { value: 'traffic_accident', label: '机动车交通事故责任纠纷' },
    { value: 'loan_dispute', label: '民间借贷' },
    { value: 'unjust_enrichment', label: '不当得利' },
    { value: 'sales_contract', label: '买卖合同纠纷' },
    { value: 'labor_contract', label: '劳务合同纠纷' },
    { value: 'divorce', label: '离婚' },
    { value: 'general', label: '一般案件（无法判断时使用）' },
];
