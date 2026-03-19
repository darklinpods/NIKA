import prisma from '../prisma';
import { aiService } from '../services/aiService';
import { getPartiesAndFactsExtractionPrompt, getInvoiceExtractionPrompt } from '../prompts/extractionPrompts';
import { SUPPORTED_CASE_TYPES } from '../constants';
import { TrafficAccidentSkill } from '../skills/TrafficAccidentSkill';
import { cleanAndParseJsonObject, cleanAndParseJsonArray } from './aiJsonParser';

// Re-export chatTools from the dedicated definitions file
// so existing imports (e.g. agents) continue to work unchanged
export { chatTools } from './toolDefinitions';

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

        const extractedData = cleanAndParseJsonObject(response.text || '{}');

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

        let invoices: any[] = cleanAndParseJsonArray(response.text || '[]');
        invoices = invoices.map((inv: any) => ({
            ...inv, amount: typeof inv.amount === 'string' ? parseFloat(inv.amount) || 0 : (inv.amount || 0),
        }));

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

export const executeGenerateEvidenceList = async (caseId: string) => {
    try {
        const docs = await prisma.caseDocument.findMany({ where: { caseId }, select: { title: true } });
        if (!docs || docs.length === 0) return { error: '案件暂无上传的证据文件。' };

        const list = docs.map((d, i) => `${i + 1}. ${d.title}`).join('\n');
        const markdownText = `## 证据目录\n\n${list}`;
        return { success: true, markdownText, message: '证据目录已生成。' };
    } catch (e: any) {
        return { error: `生成证据目录失败: ${e.message}` };
    }
};

export const executeGenerateSmartDocument = async (caseId: string) => {
    try {
        const caseRecord = await prisma.case.findUnique({
            where: { id: caseId },
            include: { documents: true }
        });
        if (!caseRecord) return { error: '案件不存在。' };

        const docsContent = (caseRecord.documents || [])
            .map((d: any) => `=== [${d.title}] ===\n${d.content}`)
            .join('\n\n');

        const skill = new TrafficAccidentSkill();
        const markdownText = await skill.generateClaimText({
            documentsContent: docsContent,
            caseTitle: caseRecord.title,
            caseDescription: caseRecord.description || '',
            parties: caseRecord.parties || ''
        });

        return { success: true, markdownText, message: '起诉状已生成，请查看下方内容。' };

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

        const subTasks: any[] = cleanAndParseJsonArray(response.text || '[]');

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

export const executeUpdateStrategyMap = async (caseId: string, strategyContent: string) => {
    try {
        await prisma.case.update({ where: { id: caseId }, data: { claimData: strategyContent } });
        return { success: true, message: '诉讼策略已保存到案件记录中。' };
    } catch (e: any) {
        return { error: `保存策略失败: ${e.message}` };
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

    if (name === 'generate_evidence_list') {
        const result = await executeGenerateEvidenceList(caseId);
        return { name, response: result };
    }

    if (name === 'generate_smart_document') {
        const result = await executeGenerateSmartDocument(caseId);
        return { name, response: result };
    }

    if (name === 'generate_execution_plan') {
        const result = await executeGenerateExecutionPlan(caseId);
        return { name, response: result };
    }

    if (name === 'update_strategy_map') {
        const result = await executeUpdateStrategyMap(caseId, args.strategyContent);
        return { name, response: result };
    }

    if (name === 'update_subtask_status') {
        const result = await executeUpdateSubtaskStatus(caseId, args.taskTitleSubstring, args.isCompleted);
        return { name, response: result };
    }

    return { name, response: { error: `Tool ${name} not found.` } };
};
