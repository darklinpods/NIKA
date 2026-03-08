// Task-related prompts for task generation and management

export const getTaskGenerationPrompt = (prompt: string, languageName: string, kContext: string) => `Generate a list of 3-5 structured legal cases for the following request: "${prompt}".
${kContext}
The response MUST be in ${languageName}.
Each case must have a title, description, priority (low, medium, or high), 1-2 relevant tags, and a list of 3-5 procedural sub-tasks (as strings).`;

export const getTaskImprovementPrompt = (taskTitle: string, taskDesc: string, languageName: string) => `Improve and expand this task description for clarity and professionalism.
The response MUST be in ${languageName}.
Task Title: ${taskTitle}
Current Description: ${taskDesc}
Output only the improved description text.`;

export const getTaskSummaryPrompt = (title: string, desc: string, languageName: string) => `As an expert legal assistant, summarize this legal case in under 80 words. Focus on the core conflict and key next step.
Language: ${languageName}
Title: ${title}
Details: ${desc}`;