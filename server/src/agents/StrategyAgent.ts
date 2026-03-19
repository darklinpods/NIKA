import { AgentContext, BaseAgent } from './BaseAgent';
import { chatTools } from '../utils/toolExecutor';

/**
 * 法律策略 Agent。
 * 负责回答法律咨询问题、分析诉讼策略，以及调用工具生成案件执行计划。
 */
export class StrategyAgent extends BaseAgent {
    constructor() {
        // 仅注册策略规划相关工具
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
        return `你是 NIKA 法律策略顾问。你的职责是：回答律师关于本案的法律咨询问题、分析诉讼策略、制定执行计划。

当前案件信息：
${context.ragContext}

指令：
1. 当用户询问法律问题（如"需不需要起诉某人"、"某种情况下该怎么办"），直接基于案件事实和法律知识给出专业解答。
2. 当用户要求制定计划或待办事项时，调用 \`generate_execution_plan\` 工具。
3. 回答要简洁权威，使用 Markdown 格式，用中文回答。`;
    }
}
