import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';
import { getPartiesAndFactsExtractionPrompt, getInvoiceExtractionPrompt } from '../prompts/extractionPrompts';
import { generateDocument, getRequiredFieldsForTemplate } from './docxUtils';

const prisma = new PrismaClient();

const SUPPORTED_CASE_TYPES = [
    { value: 'traffic_accident', label: '机动车交通事故责任纠纷' },
    { value: 'loan_dispute', label: '民间借贷' },
    { value: 'unjust_enrichment', label: '不当得利' },
    { value: 'sales_contract', label: '买卖合同纠纷' },
    { value: 'labor_contract', label: '劳务合同纠纷' },
    { value: 'divorce', label: '离婚' },
    { value: 'general', label: '一般案件（无法判断时使用）' },
];

export const executeExtractParties = async (caseId: string) => {
    try {
        const docs = await prisma.caseDocument.findMany({ where: { caseId } });
        if (!docs || docs.length === 0) {
            return { error: '案件暂无上传的证据文件，提取失败。' };
        }

        const allContent = docs.map(d => `=== [证据材料: ${d.title}] ===\n${d.content}`).join('\n\n');
        const textToAnalyze = allContent.substring(0, 25000);
        const caseTypesDesc = SUPPORTED_CASE_TYPES.map(ct => `"${ct.value}" → ${ct.label}`).join('\n');
        const prompt = getPartiesAndFactsExtractionPrompt(textToAnalyze, caseTypesDesc);

        console.log('[Tool: extract_parties] Calling AI...');
        const response = await aiService.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        let rawResult = response.text || '{}';
        rawResult = rawResult.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = rawResult.indexOf('{');
        const lastBrace = rawResult.lastIndexOf('}');
        const cleanJsonStr = (firstBrace !== -1 && lastBrace !== -1) ? rawResult.substring(firstBrace, lastBrace + 1) : '{}';

        let extractedData: any = {};
        try { extractedData = JSON.parse(cleanJsonStr); } catch (e) { extractedData = {}; }

        const newParties = extractedData.extractedParties || [];
        const factsText = extractedData.caseFactsNarrative || '';
        const detectedType = extractedData.caseType || 'general';
        const validType = SUPPORTED_CASE_TYPES.find(ct => ct.value === detectedType) ? detectedType : 'general';

        const updateData: any = { parties: JSON.stringify(newParties), caseType: validType };
        if (factsText.trim()) updateData.description = factsText.trim();

        await prisma.case.update({ where: { id: caseId }, data: updateData });

        return {
            success: true,
            message: `成功提取当事人 ${newParties.length} 个，案由识别为: ${validType}。`,
            parties: newParties
        };
    } catch (e: any) {
        console.error('[Tool: extract_parties] Error:', e);
        return { error: `提取当事人失败: ${e.message}` };
    }
};

export const executeExtractInvoices = async (caseId: string) => {
    try {
        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
        if (!caseRecord) return { error: '案件不存在。' };
        if (caseRecord.caseType !== 'traffic_accident') return { error: '发票提取功能目前仅支持"机动车交通事故责任纠纷"类型案件。' };

        const docs = await prisma.caseDocument.findMany({ where: { caseId } });
        if (!docs || docs.length === 0) return { error: '该案件暂无上传的证据文件。' };

        const allContent = docs.map(d => `=== [证据材料: ${d.title}] ===\n${d.content}`).join('\n\n');
        const textToAnalyze = allContent.substring(0, 30000);
        const prompt = getInvoiceExtractionPrompt(textToAnalyze);

        console.log('[Tool: extract_invoices] Calling AI...');
        const response = await aiService.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        let rawResult = (response.text || '[]').trim();
        rawResult = rawResult.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const firstBracket = rawResult.indexOf('[');
        const lastBracket = rawResult.lastIndexOf(']');
        const cleanJsonStr = (firstBracket !== -1 && lastBracket !== -1) ? rawResult.substring(firstBracket, lastBracket + 1) : '[]';

        let invoices: any[] = [];
        try {
            invoices = JSON.parse(cleanJsonStr).map((inv: any) => ({
                ...inv, amount: typeof inv.amount === 'string' ? parseFloat(inv.amount) || 0 : (inv.amount || 0),
            }));
        } catch (e) { invoices = []; }

        let existingFactSheet: Record<string, any> = {};
        try { if (caseRecord.caseFactSheet) existingFactSheet = JSON.parse(caseRecord.caseFactSheet); } catch { }

        const newFactSheet = { ...existingFactSheet, invoices };
        await prisma.case.update({
            where: { id: caseId },
            data: { caseFactSheet: JSON.stringify(newFactSheet) }
        });

        return {
            success: true,
            invoices,
            total: invoices.reduce((sum, inv) => sum + inv.amount, 0),
            message: `成功提取发票 ${invoices.length} 张，合计 ${invoices.reduce((sum, inv) => sum + inv.amount, 0)} 元。`
        };
    } catch (e: any) {
        console.error('[Tool: extract_invoices] Error:', e);
        return { error: `提取发票失败: ${e.message}` };
    }
};

export const executeGenerateSmartDocument = async (caseId: string, templateName: string = 'traffic_accident_complaint.txt') => {
    try {
        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
        if (!caseRecord) return { error: '案件不存在。' };

        const requiredFields = getRequiredFieldsForTemplate(templateName);
        const caseContext = `Title: ${caseRecord.title}\nDescription: ${caseRecord.description}\nParties: ${caseRecord.parties || ''}`;
        
        console.log('[Tool: generate_smart_document] Extracting data with AI...');
        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
                    text: `Extract the following required fields from the case details. 
                    If a field cannot be determined, return null for that field.
                    Please return the data strictly in JSON object format.
                    
                    Required Fields: ${JSON.stringify(requiredFields)}
                    
                    Case Details:
                    ${caseContext}`
                }]
            }]
        });

        let resultText = response.text || "{}";
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(resultText.trim());

        const finalData: Record<string, any> = {};
        requiredFields.forEach(field => {
            finalData[field] = extractedData[field] || `[待确认 ${field}]`;
        });

        const outputFileName = `Generated_${Date.now()}.txt`;
        const filePath = generateDocument(templateName, finalData, outputFileName);
        
        // Save to DB
        const newDoc = await prisma.caseDocument.create({
            data: {
                title: templateName === 'traffic_accident_complaint.txt' ? '交通交通事故诉状(AI生成)' : '智能文书(AI生成)',
                content: `该文书已成功生成并保存在服务器: ${filePath}\n\n此文书作为正式文书归档。`,
                category: 'offical_doc',
                caseId: caseId
            }
        });

        return {
            success: true,
            filePath,
            message: `成功根据模板 ${templateName} 生成了文书，并已自动保存到案件的“已生成文档”中。`
        };

    } catch (e: any) {
        console.error('[Tool: generate_smart_document] Error:', e);
        return { error: `生成文书失败: ${e.message}` };
    }
};

export const executeGenerateExecutionPlan = async (caseId: string) => {
    try {
        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
        if (!caseRecord) return { error: '案件不存在。' };

        const caseContext = `Title: ${caseRecord.title}\nDescription: ${caseRecord.description}\nParties: ${caseRecord.parties || ''}`;
        
        console.log('[Tool: generate_execution_plan] Generating plan with AI...');
        const response = await aiService.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
                role: "user", parts: [{
                    text: `Analyze the following case details and generate an execution plan containing an array of actionable sub-tasks for a lawyer.
                    Return the result STRICTLY as a JSON array of objects, where each object has a 'title' string property.
                    Keep the tasks practical (e.g., "Contact the plaintiff", "Gather medical records", "Draft complaint").
                    Limit to 5 essential tasks.
                    
                    Case Details:
                    ${caseContext}`
                }]
            }]
        });

        let resultText = response.text || "[]";
        resultText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBracket = resultText.indexOf('[');
        const lastBracket = resultText.lastIndexOf(']');
        const cleanJsonStr = (firstBracket !== -1 && lastBracket !== -1) ? resultText.substring(firstBracket, lastBracket + 1) : '[]';

        let subTasks: any[] = [];
        try {
            subTasks = JSON.parse(cleanJsonStr);
        } catch (e) {
            console.error('Failed to parse generated tasks JSON', e);
            subTasks = [];
        }

        // Save to DB
        const createdTasks = [];
        for (const task of subTasks) {
            if (task.title) {
                const newSt = await prisma.subTask.create({
                    data: {
                        title: task.title,
                        isCompleted: false,
                        caseId: caseId
                    }
                });
                createdTasks.push(newSt);
            }
        }

        return {
            success: true,
            tasks: createdTasks,
            message: `成功为案件制定了执行计划，共 ${createdTasks.length} 项任务，已自动添加到案件的工作流中。请律师在界面左下角查收。`
        };

    } catch (e: any) {
        console.error('[Tool: generate_execution_plan] Error:', e);
        return { error: `生成执行计划失败: ${e.message}` };
    }
};

export const executeUpdateSubtaskStatus = async (caseId: string, taskTitleSubstring: string, isCompleted: boolean) => {
    try {
        const subTasks = await prisma.subTask.findMany({ where: { caseId } });
        const targetTask = subTasks.find(st => st.title.toLowerCase().includes(taskTitleSubstring.toLowerCase()));
        
        if (!targetTask) return { error: `未找到名称包含 "${taskTitleSubstring}" 的子任务。` };

        await prisma.subTask.update({
            where: { id: targetTask.id },
            data: { isCompleted }
        });

        return {
            success: true,
            message: `成功将任务 "${targetTask.title}" 的状态更新为: ${isCompleted ? '已完成' : '未完成'}。请提醒用户可以在左下角查看更新后的状态。`
        };
    } catch (e: any) {
        console.error('[Tool: update_subtask_status] Error:', e);
        return { error: `更新任务状态失败: ${e.message}` };
    }
};

export const chatTools = [
    {
        functionDeclarations: [
            {
                name: "extract_parties",
                description: "当用户要求提取、扫描或者梳理案件中的当事人信息、案由、案件事实时调用。此工具会自动读取案件证据，提取相关信息并更新案件资料。",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: {
                            type: "STRING",
                            description: "当前案件的 ID，必须提供"
                        }
                    },
                    required: ["caseId"]
                }
            },
            {
                name: "extract_invoices",
                description: "当用户要求提取案件证据中的发票清单时调用，会自动清点发票种类和金额并合计。仅适用于交通事故类案件。",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: { type: "STRING" }
                    },
                    required: ["caseId"]
                }
            },
            {
                name: "generate_smart_document",
                description: "当用户要求生成诉状、智能文书、或者基于模板生成排版文书时调用此工具。",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: { type: "STRING" },
                        templateName: { type: "STRING", description: "默认填 'traffic_accident_complaint.txt'" }
                    },
                    required: ["caseId"]
                }
            },
            {
                name: "generate_execution_plan",
                description: "Applies when the user asks for a plan, todo list, analysis, or next steps for the case. It analyzes the case facts and creates a list of SubTasks (execution plan).",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: { type: "STRING" }
                    },
                    required: ["caseId"]
                }
            },
            {
                name: "update_subtask_status",
                description: "Applies when the user says they have completed or undone a specific task in the execution plan.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: { type: "STRING" },
                        taskTitleSubstring: { type: "STRING", description: "A substring of the task title to identify which task to update." },
                        isCompleted: { type: "BOOLEAN", description: "True if the task is done, false if it is not done." }
                    },
                    required: ["caseId", "taskTitleSubstring", "isCompleted"]
                }
            }
        ]
    }
];

export const handleToolCall = async (functionCall: any, caseId: string) => {
    const { name, args } = functionCall;
    console.log(`[ToolExecutor] Executing ${name} with args:`, args);

    if (name === 'extract_parties') {
        const result = await executeExtractParties(caseId); // Force use context caseId
        return { name, response: result };
    }
    
    if (name === 'extract_invoices') {
        const result = await executeExtractInvoices(caseId);
        return { name, response: result };
    }

    if (name === 'generate_smart_document') {
        const result = await executeGenerateSmartDocument(caseId, args.templateName);
        return { name, response: result };
    }

    if (name === 'generate_execution_plan') {
        const result = await executeGenerateExecutionPlan(caseId);
        return { name, response: result };
    }

    if (name === 'update_subtask_status') {
        const result = await executeUpdateSubtaskStatus(caseId, args.taskTitleSubstring, args.isCompleted);
        return { name, response: result };
    }

    return { name, response: { error: `Tool ${name} not found.` } };
};
