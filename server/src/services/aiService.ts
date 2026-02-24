import { GoogleGenAI } from "@google/genai";

class AIService {
    private keys: string[] = [];
    private currentIndex: number = 0;
    private maxRetries: number = 3;

    constructor() {
        const rawKeys = process.env.GEMINI_API_KEY || "";
        // 支持逗号分隔的多个 Key，并进行清理
        this.keys = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

        if (this.keys.length === 0) {
            console.error("[AIService] No API keys found in GEMINI_API_KEY environment variable.");
        } else {
            console.log(`[AIService] Initialized with ${this.keys.length} API keys.`);
        }
    }

    /**
     * 获取当前可用的 AI 客户端 (简单轮询)
     */
    private getClient() {
        if (this.keys.length === 0) throw new Error("No API keys configured.");
        const key = this.keys[this.currentIndex];
        return new GoogleGenAI({ apiKey: key, apiVersion: 'v1' });
    }

    /**
     * 自动轮换到下一个 Key
     */
    private rotateKey() {
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        console.log(`[AIService] Rotating to next API key (Index: ${this.currentIndex})...`);
    }

    /**
     * 统一的生成内容方法，带自动重试和 Key 轮换
     */
    async generateContent(params: {
        model?: string;
        contents: any;
        config?: any;
    }) {
        let lastError: any = null;
        const modelName = params.model || "gemini-2.5-flash";

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const client = this.getClient();
                // 注意：旧代码使用的是 ai.models.generateContent 或者是 model.generateContent
                // 这里我们统一使用这种方式
                const result = await client.models.generateContent({
                    model: modelName,
                    contents: params.contents,
                    config: params.config
                });

                return result;
            } catch (error: any) {
                lastError = error;
                const errorStr = JSON.stringify(error).toLowerCase();
                const isQuotaError = errorStr.includes("429") || errorStr.includes("resource_exhausted") || errorStr.includes("quota");

                if (isQuotaError && this.keys.length > 1) {
                    console.warn(`[AIService] Quota exceeded on key ${this.currentIndex}. Attempting rotation...`);
                    this.rotateKey();
                    // 继续下一次循环进行重试
                    continue;
                }

                // 如果不是配额错误，或者只有一个 Key，直接抛出
                throw error;
            }
        }

        throw lastError || new Error("AI Request failed after multiple retries and rotations.");
    }
}

export const aiService = new AIService();
