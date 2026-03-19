import { aiService } from '../services/aiService';
import { FactAgent } from './FactAgent';
import { DraftingAgent } from './DraftingAgent';
import { StrategyAgent } from './StrategyAgent';
import { AgentContext } from './BaseAgent';

/**
 * 路由 Agent（入口调度器）。
 * 不直接处理业务，而是通过 AI 分析用户意图，
 * 将请求分发给 FactAgent、DraftingAgent 或 StrategyAgent 执行。
 */
export class RouterAgent {
    // 三个专业子 Agent 实例，按需调用
    private factAgent = new FactAgent();
    private draftingAgent = new DraftingAgent();
    private strategyAgent = new StrategyAgent();

    /** 生成路由器的 System Prompt，描述各子 Agent 职责及路由规则 */
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

    /**
     * 路由并执行：先由 AI 判断意图，再将任务委派给对应子 Agent。
     *
     * @param context          案件上下文
     * @param historyParts     历史对话消息列表
     * @param userMessage      本轮用户消息
     * @param handleToolCallFn 工具执行回调，透传给子 Agent
     * @returns                子 Agent 的响应文本及更新后的对话历史
     */
    async routeAndExecute(context: AgentContext, historyParts: any[], userMessage: string, handleToolCallFn: (call: any, caseId: string) => Promise<any>): Promise<{ responseText: string; finalHistory: any[] }> {
        console.log('[RouterAgent] Evaluating user request...');
        const routerPrompt = this.getRouterPrompt(context);
        const fullPrompt = `[System Instructions]\n${routerPrompt}\n\n[User Request]\n${userMessage}`;

        const currentChatParts = [...historyParts, { role: 'user', parts: [{ text: fullPrompt }] }];

        // 路由器专用工具：仅声明 route_to_agent，AI 通过此工具告知目标 Agent
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

        // AI 返回工具调用 → 解析目标 Agent 并委派执行
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

                // 将子 Agent 的响应追加到对话历史后返回
                currentChatParts.push({ role: 'model', parts: [{ text: delegatedResponse }] });
                return { responseText: delegatedResponse, finalHistory: currentChatParts };
            }
        }

        // AI 未路由（简单问候或基础事实查询）→ 直接返回 AI 文本响应
        const text = response.text || "我不太明白您的意思，请具体说明。";
        currentChatParts.push({ role: 'model', parts: [{ text }] });
        return { responseText: text, finalHistory: currentChatParts };
    }
}
