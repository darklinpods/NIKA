import { AgentContext, BaseAgent } from './BaseAgent';
import { chatTools } from '../utils/toolExecutor';
import { loadSkill } from '../skills/SkillLoader';

export class DraftingAgent extends BaseAgent {
    constructor() {
        const myTools = chatTools[0].functionDeclarations.filter(t =>
            t.name === 'generate_smart_document' || t.name === 'generate_evidence_list'
        );
        super(
            'DraftingAgent',
            'Responsible for generating legal documents like complaints, evidence lists, etc.',
            [{ functionDeclarations: myTools }]
        );
    }

    getSystemPrompt(context: AgentContext): string {
        const caseType = context.caseRecord?.caseType ?? 'general';
        const { content: skillContent } = loadSkill(caseType);
        const skillSection = skillContent
            ? `\n\n## 本案件类型 Skill 规则\n${skillContent}`
            : '';
        return `You are the NIKA Legal Drafting Agent.
Your role is to write structured, formatted, and professional legal documents based on user requests and case facts.

Current Case Info:
${context.ragContext}

Instructions:
1. When asked to generate a complaint/pleading (起诉状/诉状), call the \`generate_smart_document\` tool.
2. When asked to generate an evidence list (证据目录/证据清单), call the \`generate_evidence_list\` tool.
3. When asked to generate any OTHER type of legal document (e.g. 法律意见书, 律师函, 答辩状, 合同, etc.), write it DIRECTLY in well-formatted Markdown WITHOUT calling any tool.
4. After a tool returns, output the markdownText DIRECTLY as your final response. Do NOT call the tool again.
${skillSection}`;
    }
}
