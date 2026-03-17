import { AgentContext, BaseAgent } from './BaseAgent';
import { chatTools } from '../utils/toolExecutor';

export class StrategyAgent extends BaseAgent {
    constructor() {
        const myTools = chatTools[0].functionDeclarations.filter(t => 
            t.name === 'generate_execution_plan' || t.name === 'update_subtask_status'
        );

        super(
            'StrategyAgent', 
            'Responsible for creating case execution plans, todo lists, and analyzing next steps based on legal strategies.',
            [{ functionDeclarations: myTools }]
        );
    }

    getSystemPrompt(context: AgentContext): string {
        return `You are the NIKA Strategy Agent.
Your role is to act as a senior legal consultant, designing the execution plan and analyzing case progression.

Current Case Info: 
${context.ragContext}

Instructions:
1. When asked to formulate a plan, list todos, or figure out the next steps, YOU MUST call the \`generate_execution_plan\` tool.
2. If the user asks general strategic questions, answer them intelligently using the provided case context and your legal knowledge.
3. Be concise and authoritative in your tone. Use Markdown bullet points to present plans clearly.`;
    }
}
