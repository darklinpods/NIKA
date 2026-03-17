import { AgentContext, BaseAgent } from './BaseAgent';
import { chatTools } from '../utils/toolExecutor';

export class FactAgent extends BaseAgent {
    constructor() {
        const myTools = chatTools[0].functionDeclarations.filter(t => 
            t.name === 'extract_parties' || t.name === 'extract_invoices'
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
3. Once the tools return, provide a concise summary of the extracted data to the user. Do not make up facts that are not returned by the tool or in the Context.`;
    }
}
