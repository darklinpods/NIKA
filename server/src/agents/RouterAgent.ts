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
        return `你是 NIKA 案件路由器。根据用户意图将请求路由到合适的专业 Agent。

可用 Agent：
- FACT_AGENT：提取当事人、发票、事实、扫描证据数据。
- DRAFTING_AGENT：生成文书、起诉状、法律意见书、律师函、答辩状、证据清单、草稿等各类法律文书。
- STRATEGY_AGENT：法律咨询问题（如"需不需要起诉某人"、"某种情况怎么处理"）、诉讼策略分析、工作计划、下一步建议。

当前案件摘要：
${context.ragContext.substring(0, 1500)}

指令：
1. 分析用户请求意图。
2. 若属于上述 Agent 职责范围，调用 \`route_to_agent\` 工具路由。
3. 仅对简单问候或已在摘要中明确的基础事实查询直接回答，不路由。`;
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
