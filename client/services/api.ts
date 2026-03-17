import { Case, Priority } from '../types';

const API_Base = '/api';

/**
 * 客户端 API 请求统一包装器
 * 用于封装原生的 fetch 请求，并提供全局统一的错误处理、自动 JSON 序列化、以及 HTTP 动词方法的语义化调用
 */
class ApiClient {
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${API_Base}${endpoint}`;
        const headers = new Headers(options.headers || {});

        // 默认自动添加 JSON Header（除非是表单上传场景）
        if (!(options.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }

        const config: RequestInit = {
            ...options,
            headers,
        };

        const response = await fetch(url, config);

        // 如果请求响应状态表明不成功，则统一在此处抛出并拦截格式化日志
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: 'Raw error response' };
            }
            console.group(`🔴 API Error: ${options.method || 'GET'} ${url}`);
            console.error('Status:', response.status);
            console.error('Error Details:', errorData);
            console.groupEnd();

            const message = errorData.details || errorData.error || `Failed to fetch from ${endpoint}`;
            throw new Error(message);
        }

        // 处理无内容的成功响应
        if (response.status === 204) {
            return {} as T;
        }

        // 解析并返回 JSON
        return response.json();
    }

    // 提供基础的四个语义化 HTTP 方法
    public get<T>(endpoint: string, options?: RequestInit) {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    public post<T>(endpoint: string, body: any, options?: RequestInit) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body)
        });
    }

    public put<T>(endpoint: string, body: any, options?: RequestInit) {
        return this.request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
    }

    public delete<T>(endpoint: string, options?: RequestInit) {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

// 导出统一的单例实例
export const api = new ApiClient();

// 对外暴露针对业务实体的强类型调用函数
export const fetchCases = (): Promise<Case[]> => api.get<Case[]>('/cases');
export const createCase = (caseData: Partial<Case>): Promise<Case> => api.post<Case>('/cases', caseData);
export const updateCase = (id: string, caseData: Partial<Case>): Promise<Case> => api.put<Case>(`/cases/${id}`, caseData);
export const reorderCases = (updates: { id: string, order: number, status: string }[]): Promise<any> => api.put<any>('/reorder', updates);
export const deleteCase = (id: string): Promise<void> => api.delete<void>(`/cases/${id}`);
export const smartImportCase = (formData: FormData): Promise<{ success: boolean; data: Partial<Case> }> => api.post<{ success: boolean; data: Partial<Case> }>('/cases/smart-import', formData);
export const uploadCaseEvidence = (id: string, formData: FormData): Promise<{ success: boolean; data: Case; importedParties: any[] }> => api.post<{ success: boolean; data: Case; importedParties: any[] }>(`/cases/${id}/evidence`, formData);

// Chat API
export const fetchChatHistory = (caseId: string): Promise<{ success: boolean; data: any[] }> => api.get<{ success: boolean; data: any[] }>(`/cases/${caseId}/chat`);
export const sendChatMessage = (caseId: string, content: string, lang: string): Promise<{ success: boolean; userMessage: any; aiMessage: any }> =>
    api.post<{ success: boolean; userMessage: any; aiMessage: any }>(`/cases/${caseId}/chat`, { content, lang });

export const fetchKnowledgeDocs = (): Promise<any[]> => api.get<any[]>('/knowledge');
export const uploadKnowledgeDoc = (formData: FormData): Promise<any> => api.post<any>('/knowledge/upload', formData);
export const deleteKnowledgeDoc = (id: string): Promise<void> => api.delete<void>(`/knowledge/${id}`);
export const updateKnowledgeDoc = (id: string, data: { title?: string, category?: string }): Promise<any> => api.put<any>(`/knowledge/${id}`, data);

// Complaint Generator API
export const extractComplaint = (text: string, templateId: string): Promise<{ success: boolean; data?: any; markdownText?: string }> => api.post('/complaints/extract', { text, templateId });
