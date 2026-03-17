
import { AIResponse } from "../types";
import { handleApiError } from "../utils/errorHandler";

const API_Base = '/api/ai';

const handleAIResponse = async (response: Response, errorMessage: string) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: 'Raw AI error response' };
    }
    console.group(`🤖 AI Service Error: ${errorMessage}`);
    console.error('Status:', response.status);
    console.error('URL:', response.url);
    console.error('Error Details:', errorData);
    console.groupEnd();

    const message = errorData.details || errorData.error || errorMessage;
    throw new Error(message);
  }
  return response.json();
};

export const generateTasks = async (prompt: string): Promise<AIResponse> => {
  const response = await fetch(`${API_Base}/generate-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, lang: 'zh' }),
  });
  return handleAIResponse(response, 'Failed to generate tasks');
};

export const suggestImprovement = async (taskTitle: string, taskDesc: string): Promise<string> => {
  const response = await fetch(`${API_Base}/suggest-improvement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskTitle, taskDesc, lang: 'zh' }),
  });
  const data = await handleAIResponse(response, 'Failed to suggest improvement');
  return data.suggestion;
};

export const summarizeTask = async (title: string, desc: string): Promise<string> => {
  const response = await fetch(`${API_Base}/summarize-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, desc, lang: 'zh' }),
  });
  const data = await handleAIResponse(response, 'Failed to summarize task');
  return data.summary;
};

export const generateCaseDocument = async (
  docType: 'analysis' | 'strategy' | 'offical_doc' | 'evidence_list',
  caseTitle: string,
  caseDesc: string
): Promise<string> => {
  const response = await fetch(`${API_Base}/generate-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docType, caseTitle, caseDesc, lang: 'zh' }),
  });
  const data = await handleAIResponse(response, 'Failed to generate document');
  return data.document;
};

export const generateCasePlan = async (
  title: string,
  desc: string
): Promise<{ subTasks: string[] }> => {
  const response = await fetch(`${API_Base}/generate-case-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, desc, lang: 'zh' }),
  });
  return handleAIResponse(response, 'Failed to generate case plan');
};