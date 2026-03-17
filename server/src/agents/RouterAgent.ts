import { aiService } from '../services/aiService';
import { FactAgent } from './FactAgent';
import { DraftingAgent } from './DraftingAgent';
import { StrategyAgent } from './StrategyAgent';
import { AgentContext } from './BaseAgent';

export class RouterAgent {
    private factAgent = new FactAgent();
    private draftingAgent = new DraftingAgent();
    private strategyAgent = new StrategyAgent();

    private getRouterPrompt(context: AgentContext): string {
        return `You are the ultimate NIKA Case Director (Router).
Your role is to understand the user's intent and route the request to the appropriate specialized agent.

Available Agents:
- FACT_AGENT: Call this if the user wants to extract parties, invoices, facts, or scan evidence data from the case.
- DRAFTING_AGENT: Call this if the user wants to generate documents, complaints, evidence lists, or drafts.
- STRATEGY_AGENT: Call this if the user wants a work plan, todo list, legal strategy analysis, or next steps.

Current Case Info Summary:
${context.ragContext.substring(0, 1000)} /* Just a brief context for routing */

Instructions:
1. Examine the User Request.
2. If it clearly falls into one of the agent domains, call the \`route_to_agent\` tool with the appropriate string: "FACT_AGENT", "DRAFTING_AGENT", or "STRATEGY_AGENT".
3. If it does not require a specialized agent (e.g., general greeting or simple question about the basic case facts already stated), DO NOT call the tool. Just answer the user directly here.`;
    }

    async routeAndExecute(context: AgentContext, historyParts: any[], userMessage: string, handleToolCallFn: (call: any, caseId: string) => Promise<any>): Promise<{ responseText: string; finalHistory: any[] }> {
        console.log('[RouterAgent] Evaluating user request...');
        const routerPrompt = this.getRouterPrompt(context);
        const fullPrompt = `[System Instructions]\n${routerPrompt}\n\n[User Request]\n${userMessage}`;
        
        const currentChatParts = [...historyParts, { role: 'user', parts: [{ text: fullPrompt }] }];
        
        const routerTools = [{
            functionDeclarations: [{
                name: "route_to_agent",
                description: "Routes the task to a specialized sub-agent.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        agent: { 
                            type: "STRING", 
                            enum: ["FACT_AGENT", "DRAFTING_AGENT", "STRATEGY_AGENT"],
                            description: "The agent to route to based on intent."
                        }
                    },
                    required: ["agent"]
                }
            }]
        }];

        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: currentChatParts,
            tools: routerTools
        });

        // Check if router decides to delegate
        if ((response as any).functionCalls && (response as any).functionCalls.length > 0) {
            const call = (response as any).functionCalls[0];
            if (call.name === 'route_to_agent') {
                const targetAgent = call.args?.agent || call.args?.agent_name;
                console.log(`[RouterAgent] Routing task to ${targetAgent}`);

                let delegatedResponse = '';
                if (targetAgent === 'FACT_AGENT') {
                    delegatedResponse = await this.factAgent.run(context, historyParts, userMessage, handleToolCallFn);
                } else if (targetAgent === 'DRAFTING_AGENT') {
                    delegatedResponse = await this.draftingAgent.run(context, historyParts, userMessage, handleToolCallFn);
                } else if (targetAgent === 'STRATEGY_AGENT') {
                    delegatedResponse = await this.strategyAgent.run(context, historyParts, userMessage, handleToolCallFn);
                } else {
                    delegatedResponse = "Unknown agent selected. Falling back.";
                }

                currentChatParts.push({ role: 'model', parts: [{ text: delegatedResponse }] });
                return { responseText: delegatedResponse, finalHistory: currentChatParts };
            }
        }

        // Add model response
        const text = response.text || "我不太明白您的意思，请具体说明。";
        currentChatParts.push({ role: 'model', parts: [{ text }] });
        return { responseText: text, finalHistory: currentChatParts };
    }
}
