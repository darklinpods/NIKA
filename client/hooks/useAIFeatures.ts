import { useCallback, useState } from 'react';
import { BoardData, Case, SubTask } from '../types';
import { generateCasePlan, summarizeTask } from '../services/geminiService';
import { updateCase } from '../services/api';
import { logError } from '../utils/errorHandler';

/**
 * AI 智能功能专属 Hook
 * 负责调用大语言模型生成案件执行计划 (子任务列表) 和案件智能摘要
 */
export const useAIFeatures = (
    data: BoardData,
    loadData: () => Promise<void>,
    editingTask: Case | null,
    setEditingTask: React.Dispatch<React.SetStateAction<Case | null>>
) => {
    // 追踪 AI 摘要是否正在生成中
    const [isOverviewGenerating, setIsOverviewGenerating] = useState(false);

    /**
     * 调用 AI 自动生成案件的执行计划 (SubTasks)
     * 根据案件标题和描述，生成具体的待办步骤并追加到案件的子任务列表中
     * @param caseId 案件的唯一标识
     */
    const handleGeneratePlan = useCallback(async (caseId: string) => {
        const currentCase = data.tasks[caseId];
        if (!currentCase) return;
        try {
            const result = await generateCasePlan(currentCase.title, currentCase.description);

            // 为 AI 生成的每条计划创建新的子任务对象
            const newSubTasks: SubTask[] = result.subTasks.map(title => ({
                id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title,
                isCompleted: false
            }));

            const updatedCase = { ...currentCase, subTasks: [...currentCase.subTasks, ...newSubTasks] };

            // 将包含新子任务的案件数据保存到后端 API
            await updateCase(caseId, { subTasks: updatedCase.subTasks });

            // 重新拉取数据以刷新看板
            loadData();
        } catch (err) {
            logError(err, 'handleGeneratePlan');
        }
    }, [data.tasks, loadData]);

    /**
     * 调用 AI 自动生成案件的智能摘要
     * 将生成的摘要保存在当前正在编辑的案件对象中 (`editingTask`)，直至用户点击保存
     */
    const handleGenerateAiOverview = useCallback(async () => {
        if (!editingTask) return;
        setIsOverviewGenerating(true);
        try {
            const summary = await summarizeTask(editingTask.title, editingTask.description);
            setEditingTask({ ...editingTask, aiSummary: summary });
        } catch (err) {
            logError(err, 'handleGenerateAiOverview');
        } finally {
            setIsOverviewGenerating(false);
        }
    }, [editingTask, setEditingTask]);

    return {
        isOverviewGenerating,
        handleGeneratePlan,
        handleGenerateAiOverview
    };
};
