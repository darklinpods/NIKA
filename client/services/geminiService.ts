
import { AIResponse } from "../types";
import { handleApiError } from "../utils/errorHandler";

const API_Base = 'http://localhost:3001/api/ai';

export const generateTasks = async (prompt: string, lang: 'en' | 'zh'): Promise<AIResponse> => {
  try {
    const response = await fetch(`${API_Base}/generate-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, lang }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate tasks');
    }
    return response.json();
  } catch (error) {
    throw handleApiError(error);
  }
};

export const suggestImprovement = async (taskTitle: string, taskDesc: string, lang: 'en' | 'zh'): Promise<string> => {
  try {
    const response = await fetch(`${API_Base}/suggest-improvement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskTitle, taskDesc, lang }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to suggest improvement');
    }
    const data = await response.json();
    return data.suggestion;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const summarizeTask = async (title: string, desc: string, lang: 'en' | 'zh'): Promise<string> => {
  try {
    const response = await fetch(`${API_Base}/summarize-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, desc, lang }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to summarize task');
    }
    const data = await response.json();
    return data.summary;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const generateCaseDocument = async (
  docType: 'analysis' | 'strategy' | 'offical_doc' | 'evidence_list',
  caseTitle: string,
  caseDesc: string,
  lang: 'en' | 'zh'
): Promise<string> => {
  try {
    const response = await fetch(`${API_Base}/generate-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType, caseTitle, caseDesc, lang }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate document');
    }
    const data = await response.json();
    return data.document;
  } catch (error) {
    throw handleApiError(error);
  }
};