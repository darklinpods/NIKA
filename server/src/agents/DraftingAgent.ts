import { AgentContext, BaseAgent } from './BaseAgent';
import { chatTools } from '../utils/toolExecutor';
import { loadSkill } from '../skills/SkillLoader';

export class DraftingAgent extends BaseAgent {
    constructor() {
        const myTools = chatTools[0].functionDeclarations.filter(t =>
            t.name === 'generate_smart_document'
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
1. When asked to generate a draft or smart document, ALWAYS call the \`generate_smart_document\` tool first to get the base structure and template.
2. After the tool returns, review the generated file and summarize it.
3. If no specific action is needed, reply professionally as a legal assistant, outputting the text in well-formatted Markdown.
${skillSection}`;
    }
}
