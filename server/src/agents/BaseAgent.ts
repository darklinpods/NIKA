import { aiService } from '../services/aiService';

export interface AgentContext {
    caseId: string;
    caseRecord: any;
    ragContext: string;
}

export abstract class BaseAgent {
    name: string;
    description: string;
    tools: any[];

    constructor(name: string, description: string, tools: any[]) {
        this.name = name;
        this.description = description;
        this.tools = tools;
    }

    abstract getSystemPrompt(context: AgentContext): string;

    // Default loop for a single agent to process a user request using its specific tools
    async run(context: AgentContext, historyParts: any[], userMessage: string, handleToolCallFn: (functionCall: any, caseId: string) => Promise<any>): Promise<string> {
        console.log(`[Agent: ${this.name}] Starting execution...`);
        const systemPrompt = this.getSystemPrompt(context);
        const fullPrompt = `[System Instructions]\n${systemPrompt}\n\n[User Request]\n${userMessage}`;
        
        let currentChatParts = [...historyParts, { role: 'user', parts: [{ text: fullPrompt }] }];
        
        // --- Tool Call Loop ---
        let response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: currentChatParts,
            tools: this.tools.length > 0 ? this.tools : undefined // Gemini SDK accepts `undefined` if no tools
        });

        let loopCount = 0;
        const MAX_LOOPS = 5;

        while ((response as any).functionCalls && (response as any).functionCalls.length > 0 && loopCount < MAX_LOOPS) {
            loopCount++;
            const functionCall = (response as any).functionCalls[0];
            const functionName = functionCall.name;
            const functionArgs = functionCall.args;
            
            console.log(`[Agent: ${this.name}] Executing tool: ${functionName}`);

            // Execute the tool
            const functionResult = await handleToolCallFn(functionCall, context.caseId);

            // Record model's function request
            currentChatParts.push({
                role: 'model',
                parts: [{ functionCall: { name: functionName, args: functionArgs } }]
            });

            // Record function's result
            currentChatParts.push({
                role: 'user',
                parts: [{
                    functionResponse: {
                        name: functionName,
                        response: functionResult.response
                    }
                }]
            });

            // Gnerate next response
            response = await aiService.generateContent({
                model: "gemini-2.5-flash",
                contents: currentChatParts,
                tools: this.tools.length > 0 ? this.tools : undefined
            });
        }

        const finalText = response.text || '';
        return finalText || `[Agent: ${this.name}] Operation completed but no final text generated.`;
    }
}
