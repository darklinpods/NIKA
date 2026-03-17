/**
 * AI JSON 解析工具函数
 * 
 * 统一处理 AI 模型返回的 JSON 字符串中常见的格式问题：
 * - 被 ```json ... ``` 包裹
 * - 前后带有非 JSON 文本
 */

/**
 * 清洗 AI 返回的原始文本，去除 markdown 代码块包裹
 */
function stripMarkdownCodeBlock(raw: string): string {
    return raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

/**
 * 从 AI 返回文本中清洗并解析 JSON 对象（{...}）
 * @param raw - AI 返回的原始文本
 * @param fallback - 解析失败时返回的默认值，默认 {}
 */
export function cleanAndParseJsonObject<T = Record<string, any>>(raw: string, fallback: T = {} as T): T {
    try {
        const cleaned = stripMarkdownCodeBlock(raw);
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const jsonStr = (firstBrace !== -1 && lastBrace !== -1)
            ? cleaned.substring(firstBrace, lastBrace + 1)
            : '{}';
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('[aiJsonParser] Failed to parse JSON object:', e);
        return fallback;
    }
}

/**
 * 从 AI 返回文本中清洗并解析 JSON 数组（[...]）
 * @param raw - AI 返回的原始文本
 * @param fallback - 解析失败时返回的默认值，默认 []
 */
export function cleanAndParseJsonArray<T = any[]>(raw: string, fallback: T = [] as unknown as T): T {
    try {
        const cleaned = stripMarkdownCodeBlock(raw);
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        const jsonStr = (firstBracket !== -1 && lastBracket !== -1)
            ? cleaned.substring(firstBracket, lastBracket + 1)
            : '[]';
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('[aiJsonParser] Failed to parse JSON array:', e);
        return fallback;
    }
}
