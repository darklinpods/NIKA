import { useCallback, useRef } from 'react';
import { Case, SubTask } from '../types';
import { updateCase } from '../services/api';
import { logError } from '../utils/errorHandler';

/**
 * 子任务增删改的实时持久化 Hook
 * 所有子任务操作都会乐观更新本地状态，同时异步同步到后端。
 * 标题/日期修改使用防抖（500ms）以避免频繁请求。
 */
export const useSubTaskOperations = (
    editingTask: Case | null,
    setEditingTask: (updater: ((prev: Case | null) => Case | null) | Case | null) => void
) => {
    // 防抖 timer ref
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** 保存整个 subTasks 数组到后端（防抖版本），过滤空标题 */
    const persistSubTasksDebounced = useCallback((caseId: string, subTasks: SubTask[]) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        const toSave = subTasks.filter(st => st.title.trim() !== '' || st.isCompleted);
        debounceTimerRef.current = setTimeout(async () => {
            try {
                await updateCase(caseId, { subTasks: toSave } as any);
            } catch (e) {
                logError(e, 'persistSubTasksDebounced');
            }
        }, 500);
    }, []);

    /** 立即保存（用于删除操作），过滤空标题 */
    const persistSubTasksNow = useCallback(async (caseId: string, subTasks: SubTask[]) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        const toSave = subTasks.filter(st => st.title.trim() !== '' || st.isCompleted);
        try {
            await updateCase(caseId, { subTasks: toSave } as any);
        } catch (e) {
            logError(e, 'persistSubTasksNow');
        }
    }, []);

    /** 更新子任务标题（防抖保存） */
    const updateSubTaskTitle = useCallback((subTaskId: string, newTitle: string) => {
        if (!editingTask) return;
        const newSubTasks = editingTask.subTasks.map(st =>
            st.id === subTaskId ? { ...st, title: newTitle } : st
        );
        setEditingTask(prev => prev ? { ...prev, subTasks: newSubTasks } : null);
        persistSubTasksDebounced(editingTask.id, newSubTasks);
    }, [editingTask, setEditingTask, persistSubTasksDebounced]);

    /** 更新子任务日期（防抖保存） */
    const updateSubTaskDate = useCallback((subTaskId: string, newDate: string) => {
        if (!editingTask) return;
        const newSubTasks = editingTask.subTasks.map(st =>
            st.id === subTaskId ? { ...st, dueDate: newDate } : st
        );
        setEditingTask(prev => prev ? { ...prev, subTasks: newSubTasks } : null);
        persistSubTasksDebounced(editingTask.id, newSubTasks);
    }, [editingTask, setEditingTask, persistSubTasksDebounced]);

    /** 添加新空子任务（只更新本地状态，不立即保存到后端，等用户输入内容后再通过防抖持久化） */
    const addEmptySubTask = useCallback(() => {
        if (!editingTask) return;
        const newSub: SubTask = {
            id: `sub-${Date.now()}`,
            title: '',
            isCompleted: false
        };
        const newSubTasks = [...editingTask.subTasks, newSub];
        setEditingTask(prev => prev ? { ...prev, subTasks: newSubTasks } : null);
        // 不立即持久化，等用户输入内容后防抖保存
    }, [editingTask, setEditingTask]);

    /** 删除子任务（立即保存） */
    const deleteSubTask = useCallback(async (subTaskId: string) => {
        if (!editingTask) return;
        const newSubTasks = editingTask.subTasks.filter(st => st.id !== subTaskId);
        setEditingTask(prev => prev ? { ...prev, subTasks: newSubTasks } : null);
        await persistSubTasksNow(editingTask.id, newSubTasks);
    }, [editingTask, setEditingTask, persistSubTasksNow]);

    return {
        updateSubTaskTitle,
        updateSubTaskDate,
        addEmptySubTask,
        deleteSubTask,
    };
};
