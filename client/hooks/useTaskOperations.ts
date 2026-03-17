import { useCallback, useState } from 'react';
import { BoardData, Case, SubTask } from '../types';
import { createCase, updateCase, deleteCase } from '../services/api';
import { logError } from '../utils/errorHandler';
import { t } from '../translations';

/**
 * 案件核心操作专属 Hook
 * 负责管理任务卡的编辑状态 (editingTask)，以及子任务的增删改查、文档的增删、
 * 案件优先级的更新和删除案件等功能，并与后端 API 交互
 */
export const useTaskOperations = (
    data: BoardData,
    setData: React.Dispatch<React.SetStateAction<BoardData>>,
    loadData: () => Promise<void>,
    confirm: (options: any) => Promise<boolean>
) => {
    // 当前正在模态框中编辑的案件对象，如果为 null 则说明模态框关闭
    const [editingTask, setEditingTask] = useState<Case | null>(null);
    // 追踪编辑模态框的保存状态
    const [isSaving, setIsSaving] = useState(false);

    /**
     * 保存当前正在编辑的案件
     * 如果是新建的案件（ID以'task-'开头），将调用创建接口；
     * 如果是修改现有案件，将调用更新接口。
     */
    const saveEditedTask = useCallback(async () => {
        if (!editingTask) return;

        try {
            setIsSaving(true);
            let savedCase: Case;
            const isNew = editingTask.id.startsWith('task-');

            if (isNew) {
                const { id, ...rest } = editingTask;
                savedCase = await createCase({ ...rest, status: 'todo' } as any);
            } else {
                savedCase = await updateCase(editingTask.id, editingTask);
            }

            await loadData(); // 重新拉取数据以确保看板状态同步
            setEditingTask(null); // 关闭模态框
        } catch (error) {
            logError(error, 'saveEditedTask');
        } finally {
            setIsSaving(false);
        }
    }, [editingTask, loadData]);

    /**
     * 切换特定子任务的完成状态
     * 会先进行乐观更新（UI直接反馈）再同步到后端。
     */
    const toggleSubTask = useCallback(async (caseId: string, subTaskId: string) => {
        const currentCase = data.tasks[caseId];
        if (!currentCase) return;

        const updatedSubTasks = currentCase.subTasks.map(st =>
            st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
        );
        const updatedCase = { ...currentCase, subTasks: updatedSubTasks };

        // 乐观更新看板数据
        setData(prev => ({
            ...prev,
            tasks: { ...prev.tasks, [caseId]: updatedCase }
        }));

        // 如果当时正好在模态框中编辑该卡片，也要同步更新其状态
        if (editingTask?.id === caseId) setEditingTask(updatedCase);

        try {
            await updateCase(caseId, { subTasks: updatedSubTasks });
        } catch (e) { logError(e, 'toggleSubTask'); }
    }, [data, editingTask, setData]);

    // 添加新文档到当前正在编辑的案件记录中
    const addCaseDocument = useCallback(async (doc: any) => {
        if (!editingTask) return;
        const updatedDocs = [...(editingTask.documents || []), doc];
        setEditingTask({ ...editingTask, documents: updatedDocs });
    }, [editingTask]);

    // 从当前正在编辑的案件记录中删除指定的文档
    const deleteCaseDocument = useCallback((docId: string) => {
        if (!editingTask) return;
        const updatedDocs = (editingTask.documents || []).filter(d => d.id !== docId);
        setEditingTask({ ...editingTask, documents: updatedDocs });
    }, [editingTask]);

    // 更新编辑模式下某条子任务的标题
    const updateSubTaskTitle = useCallback((subTaskId: string, newTitle: string) => {
        if (!editingTask) return;
        setEditingTask(prev => prev ? ({
            ...prev,
            subTasks: prev.subTasks.map(st => st.id === subTaskId ? { ...st, title: newTitle } : st)
        }) : null);
    }, [editingTask]);

    // 更新编辑模式下某条子任务的截止日期
    const updateSubTaskDate = useCallback((subTaskId: string, newDate: string) => {
        if (!editingTask) return;
        setEditingTask(prev => prev ? ({
            ...prev,
            subTasks: prev.subTasks.map(st => st.id === subTaskId ? { ...st, dueDate: newDate } : st)
        }) : null);
    }, [editingTask]);

    // 在编辑模式下添加一条新的空子任务
    const addEmptySubTask = useCallback(() => {
        if (!editingTask) return;
        const newSub: SubTask = { id: `sub-${Date.now()}`, title: '', isCompleted: false };
        setEditingTask(prev => prev ? ({ ...prev, subTasks: [...prev.subTasks, newSub] }) : null);
    }, [editingTask]);

    // 在编辑模式下删除一条子任务
    const deleteSubTask = useCallback((subTaskId: string) => {
        if (!editingTask) return;
        setEditingTask(prev => prev ? ({ ...prev, subTasks: prev.subTasks.filter(st => st.id !== subTaskId) }) : null);
    }, [editingTask]);

    /**
     * 删除整个案件及所有附带的关联数据（子任务/文档等）
     * 提供带危险提醒的自定义全局确认弹窗（ConfirmProvider)
     */
    const handleDeleteCase = useCallback(async (caseId: string) => {
        const isConfirmed = await confirm({
            title: t.confirmDeleteTitle,
            message: t.confirmDeleteDesc,
            confirmText: t.deleteOption,
            cancelText: t.cancel,
            type: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await deleteCase(caseId);
            loadData();
        } catch (err) {
            logError(err, 'handleDeleteCase');
        }
    }, [loadData, confirm]);

    // 快捷调整案件的优先级，并同步后端
    const handleUpdatePriority = useCallback(async (caseId: string, priority: string) => {
        try {
            await updateCase(caseId, { priority } as any);
            loadData();
        } catch (err) {
            logError(err, 'handleUpdatePriority');
        }
    }, [loadData]);

    // 快捷设置案由，乐观更新后同步后端
    const handleUpdateCaseType = useCallback(async (caseId: string, caseType: string) => {
        // 乐观更新
        setData(prev => ({
            ...prev,
            tasks: { ...prev.tasks, [caseId]: { ...prev.tasks[caseId], caseType } }
        }));
        try {
            await updateCase(caseId, { caseType } as any);
        } catch (err) {
            logError(err, 'handleUpdateCaseType');
            loadData(); // 失败则回滚
        }
    }, [setData, loadData]);

    /**
     * 不通过拖拽，通过菜单点击快捷移动案件进入下一个/上一个阶段
     */
    const handleMoveStage = useCallback(async (caseId: string, direction: 'next' | 'prev') => {
        const currentCase = data.tasks[caseId];
        if (!currentCase) return;

        const stages = ['todo', 'in-progress', 'done'];
        const currentIndex = stages.indexOf(currentCase.status);
        let newIndex = currentIndex;

        if (direction === 'next' && currentIndex < stages.length - 1) {
            newIndex = currentIndex + 1;
        } else if (direction === 'prev' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        }

        if (newIndex !== currentIndex) {
            try {
                await updateCase(caseId, { status: stages[newIndex] } as any);
                loadData();
            } catch (err) {
                logError(err, 'handleMoveStage');
            }
        }
    }, [data.tasks, loadData]);

    return {
        editingTask,
        setEditingTask,
        isSaving,
        saveEditedTask,
        toggleSubTask,
        updateSubTaskTitle,
        updateSubTaskDate,
        addEmptySubTask,
        deleteSubTask,
        addCaseDocument,
        deleteCaseDocument,
        handleDeleteCase,
        handleUpdatePriority,
        handleMoveStage,
        handleUpdateCaseType
    };
};
