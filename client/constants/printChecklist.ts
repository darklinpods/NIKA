export interface ChecklistItem {
    label: string;
    required: boolean;
}

export interface CaseChecklist {
    title: string;
    items: ChecklistItem[];
}

const DEFAULT_ITEMS: ChecklistItem[] = [
    { label: '民事起诉状（正本1份，副本按被告人数准备）', required: true },
    { label: '授权委托书', required: true },
    { label: '律师证复印件', required: true },
    { label: '当事人身份证复印件', required: true },
    { label: '证据材料清单及证据原件/复印件', required: true },
];

export const PRINT_CHECKLISTS: Record<string, CaseChecklist> = {
    traffic_accident: {
        title: '机动车交通事故责任纠纷 — 出庭材料清单',
        items: [
            ...DEFAULT_ITEMS,
            { label: '道路交通事故认定书复印件', required: true },
            { label: '医疗费票据及病历资料', required: true },
            { label: '伤残鉴定报告（如有）', required: false },
            { label: '误工证明及收入证明', required: false },
            { label: '车辆行驶证/驾驶证复印件', required: true },
            { label: '保险单复印件', required: true },
        ],
    },
    loan_dispute: {
        title: '民间借贷纠纷 — 出庭材料清单',
        items: [
            ...DEFAULT_ITEMS,
            { label: '借条/借款合同原件及复印件', required: true },
            { label: '转账记录/银行流水', required: true },
            { label: '催款记录（短信/微信截图等）', required: false },
        ],
    },
    divorce: {
        title: '离婚纠纷 — 出庭材料清单',
        items: [
            ...DEFAULT_ITEMS,
            { label: '结婚证复印件', required: true },
            { label: '户口本复印件', required: true },
            { label: '子女出生证明（如有）', required: false },
            { label: '夫妻共同财产清单及证明材料', required: false },
        ],
    },
    labor_contract: {
        title: '劳务合同纠纷 — 出庭材料清单',
        items: [
            ...DEFAULT_ITEMS,
            { label: '劳动合同/劳务合同原件及复印件', required: true },
            { label: '工资发放记录/银行流水', required: true },
            { label: '仲裁裁决书（如已仲裁）', required: false },
        ],
    },
};

export const getChecklist = (caseType: string): CaseChecklist => {
    return PRINT_CHECKLISTS[caseType] ?? {
        title: '出庭材料清单',
        items: DEFAULT_ITEMS,
    };
};
