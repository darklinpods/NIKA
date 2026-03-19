import prisma from '../prisma';
import { aiService } from '../services/aiService';
import { getPartiesAndFactsExtractionPrompt, getInvoiceExtractionPrompt } from '../prompts/extractionPrompts';
import { SUPPORTED_CASE_TYPES, DEFAULT_MODEL } from '../constants';
import { TrafficAccidentSkill } from '../skills/TrafficAccidentSkill';
import { cleanAndParseJsonObject, cleanAndParseJsonArray } from './aiJsonParser';

// 重新导出 chatTools，调用方可从本文件或 toolDefinitions.ts 任意引入
export { chatTools } from './toolDefinitions';

/** 将文档数组拼接为 AI 可读的文本块，格式：=== [标题] ===\n内容 */
export function buildDocsContent(docs: { title: string; content: string }[]): string {
    return docs.map(d => `=== [${d.title}] ===\n${d.content}`).join('\n\n');
}

/**
 * 工具：提取当事人 & 识别案由
 * - 读取案件所有文档，截取前 25000 字符送 AI 分析
 * - 将提取结果（当事人列表、案情摘要、案由类型）写回数据库
 */
export const executeExtractParties = async (caseId: string) => {
    try {
        const docs = await prisma.caseDocument.findMany({ where: { caseId } });
        if (!docs.length) return { error: '案件暂无上传的证据文件，提取失败。' };

        const textToAnalyze = buildDocsContent(docs).substring(0, 25000);
        // 将支持的案由枚举拼成描述文本，供 AI 参考
        const caseTypesDesc = SUPPORTED_CASE_TYPES.map(ct => `"${ct.value}" → ${ct.label}`).join('\n');
        const prompt = getPartiesAndFactsExtractionPrompt(textToAnalyze, caseTypesDesc);

        const response = await aiService.generateContent({
            model: DEFAULT_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const extractedData = cleanAndParseJsonObject(response.text || '{}');
        const newParties = extractedData.extractedParties || [];
        const factsText = extractedData.caseFactsNarrative || '';
        const detectedType = extractedData.caseType || 'general';
        // AI 返回的案由若不在支持列表中，则回退为 'general'
        const validType = SUPPORTED_CASE_TYPES.find(ct => ct.value === detectedType) ? detectedType : 'general';

        const updateData: any = { parties: JSON.stringify(newParties), caseType: validType };
        // 仅当 AI 提取到案情摘要时才覆盖 description 字段
        if (factsText.trim()) updateData.description = factsText.trim();
        await prisma.case.update({ where: { id: caseId }, data: updateData });

        return { success: true, message: `成功提取当事人 ${newParties.length} 个，案由识别为: ${validType}。`, parties: newParties };
    } catch (e: any) {
        console.error('[Tool: extract_parties] Error:', e);
        return { error: `提取当事人失败: ${e.message}` };
    }
};

/**
 * 工具：提取发票明细（仅限交通事故案件）
 * - 读取文档后送 AI 识别发票条目，金额统一转为 number
 * - 将发票列表合并写入 caseFactSheet.invoices（保留其他字段）
 */
export const executeExtractInvoices = async (caseId: string) => {
    try {
        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
        if (!caseRecord) return { error: '案件不存在。' };
        if (caseRecord.caseType !== 'traffic_accident') return { error: '发票提取功能目前仅支持"机动车交通事故责任纠纷"类型案件。' };

        const docs = await prisma.caseDocument.findMany({ where: { caseId } });
        if (!docs.length) return { error: '该案件暂无上传的证据文件。' };

        const textToAnalyze = buildDocsContent(docs).substring(0, 30000);
        const response = await aiService.generateContent({
            model: DEFAULT_MODEL,
            contents: [{ role: 'user', parts: [{ text: getInvoiceExtractionPrompt(textToAnalyze) }] }]
        });

        let invoices: any[] = cleanAndParseJsonArray(response.text || '[]');
        // 统一将字符串金额转为 number，防止后续求和出错
        invoices = invoices.map((inv: any) => ({
            ...inv, amount: typeof inv.amount === 'string' ? parseFloat(inv.amount) || 0 : (inv.amount || 0),
        }));

        // 读取已有 factSheet，仅更新 invoices 字段，避免覆盖其他数据
        let existingFactSheet: Record<string, any> = {};
        try { if (caseRecord.caseFactSheet) existingFactSheet = JSON.parse(caseRecord.caseFactSheet); } catch { }

        await prisma.case.update({ where: { id: caseId }, data: { caseFactSheet: JSON.stringify({ ...existingFactSheet, invoices }) } });

        const total = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        return { success: true, invoices, total, message: `成功提取发票 ${invoices.length} 张，合计 ${total} 元。` };
    } catch (e: any) {
        console.error('[Tool: extract_invoices] Error:', e);
        return { error: `提取发票失败: ${e.message}` };
    }
};

/**
 * 工具：生成案件时间轴
 * - 从证据材料中提取关键时间节点，以 Markdown 列表形式返回
 */
export const executeGenerateTimeline = async (caseId: string) => {
    try {
        const docs = await prisma.caseDocument.findMany({ where: { caseId } });
        if (!docs.length) return { error: '案件暂无上传的证据文件。' };

        const response = await aiService.generateContent({
            model: DEFAULT_MODEL,
            contents: [{ role: 'user', parts: [{ text: `请从以下案件证据材料中提取所有关键时间节点，按时间顺序生成本案时间轴。格式要求：使用 Markdown，每个节点格式为"- **YYYY年MM月DD日**：事件描述"，无法确定具体日期的用大概时间描述。\n\n${buildDocsContent(docs).substring(0, 25000)}` }] }]
        });
        return { success: true, markdownText: `## 本案时间轴\n\n${response.text || ''}` };
    } catch (e: any) {
        return { error: `生成时间轴失败: ${e.message}` };
    }
};

/**
 * 工具：生成证据目录
 * - 仅读取文档标题，按序号列表输出，无需 AI 调用
 */
export const executeGenerateEvidenceList = async (caseId: string) => {
    try {
        const docs = await prisma.caseDocument.findMany({ where: { caseId }, select: { title: true } });
        if (!docs.length) return { error: '案件暂无上传的证据文件。' };

        const list = docs.map((d, i) => `${i + 1}. ${d.title}`).join('\n');
        return { success: true, markdownText: `## 证据目录\n\n${list}`, message: '证据目录已生成。' };
    } catch (e: any) {
        return { error: `生成证据目录失败: ${e.message}` };
    }
};

/**
 * 工具：生成智能文书（起诉状）
 * - 调用 TrafficAccidentSkill 生成 Markdown 格式起诉状正文
 */
export const executeGenerateSmartDocument = async (caseId: string) => {
    try {
        const caseRecord = await prisma.case.findUnique({ where: { id: caseId }, include: { documents: true } });
        if (!caseRecord) return { error: '案件不存在。' };

        const skill = new TrafficAccidentSkill();
        const markdownText = await skill.generateClaimText({
            documentsContent: buildDocsContent(caseRecord.documents || []),
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

/**
 * 工具：生成执行计划（子任务列表）
 * - AI 根据案件标题/描述/当事人生成最多 5 条可操作子任务
 * - 逐条写入数据库 SubTask 表，供律师在工作流面板查看
 */
export const executeGenerateExecutionPlan = async (caseId: string) => {
    try {
        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
        if (!caseRecord) return { error: '案件不存在。' };

        const response = await aiService.generateContent({
            model: DEFAULT_MODEL,
            contents: [{ role: 'user', parts: [{ text: `Analyze the following case details and generate an execution plan containing an array of actionable sub-tasks for a lawyer. Return the result STRICTLY as a JSON array of objects, where each object has a 'title' string property. Keep the tasks practical. Limit to 5 essential tasks.\n\nTitle: ${caseRecord.title}\nDescription: ${caseRecord.description}\nParties: ${caseRecord.parties || ''}` }] }]
        });

        const subTasks: any[] = cleanAndParseJsonArray(response.text || '[]');
        const createdTasks = [];
        for (const task of subTasks) {
            // 跳过没有 title 的无效条目
            if (task.title) {
                createdTasks.push(await prisma.subTask.create({ data: { title: task.title, isCompleted: false, caseId } }));
            }
        }
        return { success: true, tasks: createdTasks, message: `成功为案件制定了执行计划，共 ${createdTasks.length} 项任务，已自动添加到案件的工作流中。请律师在界面左下角查收。` };
    } catch (e: any) {
        console.error('[Tool: generate_execution_plan] Error:', e);
        return { error: `生成执行计划失败: ${e.message}` };
    }
};

/**
 * 工具：保存诉讼策略
 * - 将 AI 生成的策略文本存入 Case.claimData 字段
 */
export const executeUpdateStrategyMap = async (caseId: string, strategyContent: string) => {
    try {
        await prisma.case.update({ where: { id: caseId }, data: { claimData: strategyContent } });
        return { success: true, message: '诉讼策略已保存到案件记录中。' };
    } catch (e: any) {
        return { error: `保存策略失败: ${e.message}` };
    }
};

/**
 * 工具：更新子任务完成状态
 * - 通过标题子串模糊匹配目标任务，更新 isCompleted 字段
 */
export const executeUpdateSubtaskStatus = async (caseId: string, taskTitleSubstring: string, isCompleted: boolean) => {
    try {
        const subTasks = await prisma.subTask.findMany({ where: { caseId } });
        // 不区分大小写的子串匹配
        const targetTask = subTasks.find(st => st.title.toLowerCase().includes(taskTitleSubstring.toLowerCase()));
        if (!targetTask) return { error: `未找到名称包含 "${taskTitleSubstring}" 的子任务。` };

        await prisma.subTask.update({ where: { id: targetTask.id }, data: { isCompleted } });
        return { success: true, message: `成功将任务 "${targetTask.title}" 的状态更新为: ${isCompleted ? '已完成' : '未完成'}。请提醒用户可以在左下角查看更新后的状态。` };
    } catch (e: any) {
        console.error('[Tool: update_subtask_status] Error:', e);
        return { error: `更新任务状态失败: ${e.message}` };
    }
};

// 工具名 → 处理函数的映射表，替代 if-else 链，消除魔法字符串
const TOOL_HANDLERS: Record<string, (caseId: string, args: any) => Promise<any>> = {
    extract_parties: (caseId) => executeExtractParties(caseId),
    extract_invoices: (caseId) => executeExtractInvoices(caseId),
    generate_timeline: (caseId) => executeGenerateTimeline(caseId),
    generate_evidence_list: (caseId) => executeGenerateEvidenceList(caseId),
    generate_smart_document: (caseId) => executeGenerateSmartDocument(caseId),
    generate_execution_plan: (caseId) => executeGenerateExecutionPlan(caseId),
    update_strategy_map: (caseId, args) => executeUpdateStrategyMap(caseId, args.strategyContent),
    update_subtask_status: (caseId, args) => executeUpdateSubtaskStatus(caseId, args.taskTitleSubstring, args.isCompleted),
};

/**
 * AI 工具调用统一入口
 * - 从 TOOL_HANDLERS 查找对应处理函数并执行
 * - 未注册的工具名返回 error 而非抛出异常
 */
export const handleToolCall = async (functionCall: any, caseId: string) => {
    const { name, args } = functionCall;
    console.log(`[ToolExecutor] Executing ${name} with args:`, args);
    const handler = TOOL_HANDLERS[name];
    const result = handler ? await handler(caseId, args) : { error: `Tool ${name} not found.` };
    return { name, response: result };
};
