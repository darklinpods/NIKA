import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export type AIProvider = 'gemini' | 'openai' | 'deepseek' | 'doubao' | 'qwen';

class AIService {
    private geminiKeys: string[] = [];
    private currentGeminiIndex: number = 0;
    private maxRetries: number = 3;

    private openaiClient: OpenAI | null = null;
    private provider: AIProvider = 'gemini';

    constructor() {
        this.initialize();
    }

    private initialize() {
        // Initialize Gemini setup
        const rawKeys = process.env.GEMINI_API_KEY || "";
        this.geminiKeys = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

        if (this.geminiKeys.length > 0) {
            console.log(`[AIService] Gemini initialized with ${this.geminiKeys.length} API keys.`);
        }

        // Initialize Global Provider & OpenAI-compatible setup if configured
        this.provider = (process.env.AI_PROVIDER?.toLowerCase() as AIProvider) || 'gemini';

        if (['openai', 'deepseek', 'doubao', 'qwen'].includes(this.provider)) {
            let apiKey = process.env.OPENAI_API_KEY;
            let baseURL = process.env.OPENAI_BASE_URL;

            // Set default configurations for specific providers
            if (this.provider === 'deepseek') {
                apiKey = process.env.DEEPSEEK_API_KEY || apiKey;
                baseURL = baseURL || 'https://api.deepseek.com';
            } else if (this.provider === 'doubao') {
                apiKey = process.env.DOUBAO_API_KEY || apiKey;
                baseURL = baseURL || 'https://ep.api.vbdance.com/api/v3';
            } else if (this.provider === 'qwen') {
                apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || apiKey;
                baseURL = baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
            }

            if (apiKey) {
                this.openaiClient = new OpenAI({
                    apiKey: apiKey,
                    baseURL: baseURL || undefined
                });
                console.log(`[AIService] ${this.provider.toUpperCase()} provider initialized (BaseURL: ${baseURL || 'Default'}).`);
            } else {
                console.warn(`[AIService] AI_PROVIDER is set to ${this.provider}, but API key is missing. Falling back to Gemini.`);
                this.provider = 'gemini';
            }
        }
    }

    /**
     * 获取当前可用的 Gemini 客户端 (简单轮询)
     */
    getGeminiClient() {
        if (this.geminiKeys.length === 0) {
            this.initialize(); // Try re-initializing in case env was loaded late
        }
        if (this.geminiKeys.length === 0) throw new Error("No Gemini API keys configured. Please check GEMINI_API_KEY in .env");
        const key = this.geminiKeys[this.currentGeminiIndex];

        const config: any = { apiKey: key };
        if (process.env.GEMINI_BASE_URL) {
            config.httpOptions = { baseUrl: process.env.GEMINI_BASE_URL };
        }
        return new GoogleGenAI(config);
    }

    /**
     * 自动轮换到下一个 Gemini Key
     */
    private rotateGeminiKey() {
        this.currentGeminiIndex = (this.currentGeminiIndex + 1) % this.geminiKeys.length;
        console.log(`[AIService] Rotating to next Gemini API key (Index: ${this.currentGeminiIndex})...`);
    }

    /**
     * 判断特定的内容请求是否必须强制回退到 Gemini 
     * (例如 OCR 需要处理 inlineData PDF 时，通用的大语言模型 API 通常不支持 application/pdf 原生解析)
     */
    private requiresGeminiFallback(contents: any): boolean {
        try {
            const contentsStr = JSON.stringify(contents);
            return contentsStr.includes('inlineData') && contentsStr.includes('application/pdf');
        } catch {
            return false;
        }
    }

    /**
     * 统一的生成内容方法，带自动重试、Key 轮换、多模型路由
     */
    async generateContent(params: {
        model?: string; // 默认如果是 'gemini-2.5-flash', 并且 provider 是 openai, 会被 OPENAI_MODEL 环境变量覆盖或映射
        contents: any;
        config?: any;
        tools?: any[];
    }) {
        let lastError: any = null;

        // 决定本次请求使用的 Provider
        let effectiveProvider = this.provider;
        if (this.provider !== 'gemini' && this.requiresGeminiFallback(params.contents)) {
            console.warn(`[AIService] Request contains PDF inlineData. Forcing fallback to Gemini from ${this.provider}.`);
            effectiveProvider = 'gemini';
        }

        // ---------- OpenAI-Compatible 处理逻辑 ----------
        if (effectiveProvider !== 'gemini' && this.openaiClient) {
            // 将 Gemini 格式的 contents 转换为 OpenAI 格式的 messages
            // Gemini 格式通常为: [{ role: 'user', parts: [{ text: '...' }] }]
            const messages: any[] = [];
            try {
                for (const content of params.contents) {
                    const role = content.role === 'model' ? 'assistant' : 'user';
                    // 仅提取 text
                    if (content.parts && Array.isArray(content.parts)) {
                        const textParts = content.parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n');
                        messages.push({ role, content: textParts });
                    }
                }
            } catch (e) {
                console.error("[AIService] Failed to parse contents for OpenAI structure. Trying fallback mapping.", e);
                // 极其粗暴的 fallback 解析
                messages.push({ role: 'user', content: JSON.stringify(params.contents) });
            }

            // 获取模型名称
            let currentModel = process.env.OPENAI_MODEL || process.env.MODEL_NAME;
            if (!currentModel) {
                if (effectiveProvider === 'deepseek') currentModel = 'deepseek-chat';
                else if (effectiveProvider === 'qwen') currentModel = 'qwen-plus';
                else if (effectiveProvider === 'doubao') {
                    // 豆包需要接入点 ID，如果没有配置则给出一个明确的占位符提示错误
                    currentModel = 'ep-you-must-provide-doubao-endpoint-id';
                }
                else currentModel = 'gpt-4o-mini';
            }

            for (let attempt = 0; attempt < this.maxRetries; attempt++) {
                try {
                    const requestBody: any = {
                        model: currentModel,
                        messages: messages,
                        response_format: params.config?.responseMimeType === 'application/json' ? { type: "json_object" } : undefined,
                        temperature: params.config?.temperature,
                    };

                    if (params.tools && params.tools.length > 0) {
                        const convertSchema = (schema: any): any => {
                            if (!schema || typeof schema !== 'object') return schema;
                            const res = { ...schema };
                            if (typeof res.type === 'string') {
                                res.type = res.type.toLowerCase();
                            }
                            if (res.properties) {
                                for (const k in res.properties) {
                                    res.properties[k] = convertSchema(res.properties[k]);
                                }
                            }
                            if (res.items) {
                                res.items = convertSchema(res.items);
                            }
                            return res;
                        };

                        requestBody.tools = params.tools.flatMap((t: any) =>
                            (t.functionDeclarations || []).map((fd: any) => ({
                                type: "function",
                                function: {
                                    name: fd.name,
                                    description: fd.description,
                                    parameters: convertSchema(fd.parameters)
                                }
                            }))
                        );
                    }

                    console.log(`[AIService] Executing generation using Provider: [${effectiveProvider.toUpperCase()}] | Model: [${currentModel}]`);
                    const response = await this.openaiClient.chat.completions.create(requestBody);

                    const message = response.choices[0]?.message;
                    let textResponse = message?.content || "";
                    let functionCalls: any[] = [];

                    // 1. Parse Native OpenAI tool_calls
                    if (message?.tool_calls && message.tool_calls.length > 0) {
                        functionCalls = message.tool_calls.map((tc: any) => {
                            let args = {};
                            try { args = JSON.parse(tc.function.arguments); } catch (e) { }
                            return { name: tc.function.name, args };
                        });
                    }

                    // 2. Fallback parse for Qwen/DeepSeek pseudo-XML function calls in text
                    // Example: <|FunctionCallBegin|>[{"name":"route_to_agent","parameters":{"agent_name":"STRATEGY_AGENT"}}]<|FunctionCallEnd|>
                    const toolCallRegex = /<\|FunctionCallBegin\|>(.*?)<\|FunctionCallEnd\|>/;
                    const match = textResponse.match(toolCallRegex);
                    if (match && functionCalls.length === 0) {
                        try {
                            const parsed = JSON.parse(match[1]);
                            if (Array.isArray(parsed)) {
                                parsed.forEach((p: any) => {
                                    functionCalls.push({
                                        name: p.name,
                                        // Some models output 'parameters', some 'args'
                                        args: p.parameters || p.args || {}
                                    });
                                });
                            }
                            // Strip it from text
                            textResponse = textResponse.replace(toolCallRegex, '').trim();
                        } catch (e) {
                            console.error("[AIService] Failed to parse fallback XML tool calls", e);
                        }
                    }

                    // 构造兼容原 Gemini 接口的返回对象
                    return {
                        text: textResponse,
                        functionCalls: functionCalls.length > 0 ? functionCalls : undefined
                    };

                } catch (error: any) {
                    lastError = error;
                    console.error(`[AIService] ${effectiveProvider} attempt ${attempt + 1} failed:`, error.message || error);
                    // 等待后重试
                    await new Promise(res => setTimeout(res, 2000 * (attempt + 1)));
                }
            }
            throw lastError || new Error(`${effectiveProvider} Request failed after multiple retries.`);
        }

        // ---------- 原 Gemini 处理逻辑 ----------
        const modelName = params.model || "gemini-2.5-flash";

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const client = this.getGeminiClient();
                console.log(`[AIService] Executing generation using Provider: [GEMINI] | Model: [${modelName}]`);
                const configObj: any = { ...params.config };
                if (params.tools) {
                    configObj.tools = params.tools;
                }

                const result = await client.models.generateContent({
                    model: modelName,
                    contents: params.contents,
                    config: configObj
                });

                return result;
            } catch (error: any) {
                lastError = error;
                const errorStr = JSON.stringify(error).toLowerCase();
                const isQuotaError = errorStr.includes("429") || errorStr.includes("resource_exhausted") || errorStr.includes("quota");

                if (isQuotaError && this.geminiKeys.length > 1) {
                    console.warn(`[AIService] Quota exceeded on Gemini key ${this.currentGeminiIndex}. Attempting rotation...`);
                    this.rotateGeminiKey();
                    // 继续下一次循环进行重试
                    continue;
                }

                if (isQuotaError) {
                    console.warn(`[AIService] Gemini Quota exceeded. Retrying in 5 seconds...`);
                    await new Promise(res => setTimeout(res, 5000));
                    continue;
                }

                // 如果不是配额错误直接抛出
                throw error;
            }
        }

        throw lastError || new Error("Gemini Request failed after multiple retries and rotations.");
    }
}

export const aiService = new AIService();
