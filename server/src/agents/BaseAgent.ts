import { aiService } from '../services/aiService';
import { DEFAULT_MODEL } from '../constants';

/** Agent 执行上下文，包含当前案件的核心信息 */
export interface AgentContext {
    caseId: string;      // 案件 ID
    caseRecord: any;     // 案件完整记录（来自数据库）
    ragContext: string;  // 经 RAG 检索拼装的案件摘要文本，注入到 System Prompt
}

/**
 * 所有专业 Agent 的抽象基类。
 * 子类需实现 getSystemPrompt() 以提供各自的角色定义和指令。
 * run() 方法封装了"AI 调用 → 工具执行 → 再次 AI 调用"的标准工具调用循环。
 */
export abstract class BaseAgent {
    name: string;        // Agent 名称，用于日志标识
    description: string; // Agent 职责描述
    tools: any[];        // 该 Agent 可使用的 Gemini 工具声明列表

    constructor(name: string, description: string, tools: any[]) {
        this.name = name;
        this.description = description;
        this.tools = tools;
    }

    /** 子类实现：根据案件上下文生成 System Prompt */
    abstract getSystemPrompt(context: AgentContext): string;

    /**
     * Agent 主执行方法：将用户消息与 System Prompt 合并后发送给 AI，
     * 并循环处理工具调用，直到 AI 返回纯文本或达到最大循环次数。
     *
     * @param context          案件上下文
     * @param historyParts     历史对话消息列表（Gemini contents 格式）
     * @param userMessage      本轮用户消息
     * @param handleToolCallFn 工具执行回调，由外层 chatController 提供
     * @returns                AI 最终生成的文本
     */
    async run(context: AgentContext, historyParts: any[], userMessage: string, handleToolCallFn: (functionCall: any, caseId: string) => Promise<any>): Promise<string> {
        console.log(`[Agent: ${this.name}] Starting execution...`);
        const systemPrompt = this.getSystemPrompt(context);
        // 将 System Prompt 与用户消息合并为单条 user 消息（Gemini 不支持独立 system role）
        const fullPrompt = `[System Instructions]\n${systemPrompt}\n\n[User Request]\n${userMessage}`;

        let currentChatParts = [...historyParts, { role: 'user', parts: [{ text: fullPrompt }] }];

        // --- 工具调用循环：AI 可能连续多次请求调用工具 ---
        let response = await aiService.generateContent({
            model: DEFAULT_MODEL,
            contents: currentChatParts,
            tools: this.tools.length > 0 ? this.tools : undefined // 无工具时传 undefined
        });

        let loopCount = 0;
        const MAX_LOOPS = 5; // 防止无限循环，最多执行 5 次工具调用

        while ((response as any).functionCalls && (response as any).functionCalls.length > 0 && loopCount < MAX_LOOPS) {
            loopCount++;
            const functionCall = (response as any).functionCalls[0];
            const functionName = functionCall.name;
            const functionArgs = functionCall.args;

            console.log(`[Agent: ${this.name}] Executing tool: ${functionName}`);

            // 执行工具，结果由 toolExecutor 处理
            const functionResult = await handleToolCallFn(functionCall, context.caseId);

            // 若工具直接返回 markdownText（如文书生成），则跳过第二次 AI 调用直接返回
            if (functionResult.response?.markdownText) {
                return functionResult.response.markdownText;
            }

            // 将模型的工具调用请求追加到对话历史
            currentChatParts.push({
                role: 'model',
                parts: [{ functionCall: { name: functionName, args: functionArgs } }]
            });

            // 将工具执行结果追加到对话历史，供 AI 继续推理
            currentChatParts.push({
                role: 'user',
                parts: [{
                    functionResponse: {
                        name: functionName,
                        response: functionResult.response
                    }
                }]
            });

            // 携带工具结果再次请求 AI，获取下一步响应
            response = await aiService.generateContent({
                model: DEFAULT_MODEL,
                contents: currentChatParts,
                tools: this.tools.length > 0 ? this.tools : undefined
            });
        }

        const finalText = response.text || '';
        return finalText || `[Agent: ${this.name}] Operation completed but no final text generated.`;
    }
}
