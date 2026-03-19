import { AgentContext, BaseAgent } from './BaseAgent';
import { chatTools } from '../utils/toolExecutor';

/**
 * 事实提取 Agent。
 * 负责从案件证据中提取结构化信息：当事人信息、发票/财务数据、事件时间线。
 * 严格依赖工具返回结果，不凭空捏造事实。
 */
export class FactAgent extends BaseAgent {
    constructor() {
        // 仅注册事实提取相关工具
        const myTools = chatTools[0].functionDeclarations.filter(t =>
            t.name === 'extract_parties' || t.name === 'extract_invoices' || t.name === 'generate_timeline'
        );
        super(
            'FactAgent',
            'Responsible for extracting facts, parties, and invoices from case evidence.',
            [{ functionDeclarations: myTools }]
        );
    }

    getSystemPrompt(context: AgentContext): string {
        return `You are the NIKA Fact Extractor Agent.
Your sole responsibility is to scan the available evidence in the legal case and extract structured facts.
Current Case Info:
${context.ragContext}

Instructions:
1. When asked to find parties or scan facts, YOU MUST call the \`extract_parties\` tool.
2. When asked to find financial data or invoices, YOU MUST call the \`extract_invoices\` tool.
3. When asked to generate a timeline or chronology of events, YOU MUST call the \`generate_timeline\` tool.
4. Once the tools return, provide a concise summary of the extracted data to the user. Do not make up facts that are not returned by the tool or in the Context.`;
    }
}
