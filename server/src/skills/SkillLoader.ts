import fs from 'fs';
import path from 'path';

const SKILL_MAP: Record<string, { skillFile: string; templateName: string }> = {
    traffic_accident: {
        skillFile: 'skills/traffic_accident.md',
        templateName: '民事起诉状（机动车交通事故责任纠纷）.docx',
    },
    divorce: {
        skillFile: 'skills/divorce.md',
        templateName: '民事起诉状（离婚纠纷）.docx',
    },
    loan_dispute: {
        skillFile: 'skills/loan_dispute.md',
        templateName: '民事起诉状（民间借贷纠纷）.docx',
    },
    labor_contract: {
        skillFile: 'skills/labor_dispute.md',
        templateName: '民事起诉状（劳动争议纠纷）.docx',
    },
    sales_contract: {
        skillFile: null as any,
        templateName: '民事起诉状（买卖合同纠纷）.docx',
    },
};

export function loadSkill(caseType: string): { content: string; templateName: string } {
    const entry = SKILL_MAP[caseType];
    const templateName = entry?.templateName ?? '民事起诉状（机动车交通事故责任纠纷）.docx';

    if (!entry?.skillFile) return { content: '', templateName };

    const root = path.resolve(process.cwd(), '..');
    const skillPath = fs.existsSync(path.join(root, entry.skillFile))
        ? path.join(root, entry.skillFile)
        : path.join(process.cwd(), entry.skillFile);

    const content = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf-8') : '';
    return { content, templateName };
}
