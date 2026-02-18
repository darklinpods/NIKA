import { useState, useCallback, useMemo } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { BoardData, Case, SubTask } from '../types';
import { INITIAL_DATA } from '../constants';
import { generateTasks, suggestImprovement, summarizeTask } from '../services/geminiService';
import { translations } from '../translations';
import { handleStorageError, logError } from '../utils/errorHandler';

/**
 * useApp 钩子是应用程序的主状态管理器。
 * 它处理看板数据、任务编辑、拖拽逻辑以及与 AI 服务的交互。
 * 
 * @param lang 当前语言 ('zh' | 'en')
 * @param theme 当前主题 ('light' | 'dark')
 */
export const useApp = (lang: 'zh' | 'en', theme: 'light' | 'dark') => {
  const t = translations[lang];

  // 核心数据状态：看板数据（从 localStorage 初始化）
  const [data, setData] = useState<BoardData>(() => {
    try {
      const saved = localStorage.getItem('boardData');
      return saved ? JSON.parse(saved) : INITIAL_DATA;
    } catch (error) {
      handleStorageError(error, 'initializeData');
      return INITIAL_DATA;
    }
  });

  // 当前正在编辑的任务（模态框使用）
  const [editingTask, setEditingTask] = useState<Case | null>(null);
  // AI 摘要生成状态
  const [isOverviewGenerating, setIsOverviewGenerating] = useState(false);

  /**
   * 将看板数据同步到状态和本地存储。
   */
  const saveData = useCallback((newData: BoardData) => {
    setData(newData);
    try {
      localStorage.setItem('boardData', JSON.stringify(newData));
    } catch (error) {
      handleStorageError(error, 'saveData');
    }
  }, []);

  /**
   * 处理看板列中任务的拖拽结束逻辑。
   */
  const onDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    // 同一列内排序
    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      saveData({ ...data, columns: { ...data.columns, [start.id]: { ...start, taskIds: newTaskIds } } });
      return;
    }

    // 跨列移动任务
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);

    saveData({
      ...data,
      columns: {
        ...data.columns,
        [start.id]: { ...start, taskIds: startTaskIds },
        [finish.id]: { ...finish, taskIds: finishTaskIds },
      },
    });
  }, [data, saveData]);

  /**
   * 切换子任务的完成状态。
   */
  const toggleSubTask = useCallback((caseId: string, subTaskId: string) => {
    const currentCase = data.tasks[caseId];
    if (!currentCase) return;

    const updatedSubTasks = currentCase.subTasks.map(st =>
      st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    const updatedCase = { ...currentCase, subTasks: updatedSubTasks };

    saveData({ ...data, tasks: { ...data.tasks, [caseId]: updatedCase } });
    if (editingTask?.id === caseId) setEditingTask(updatedCase);
  }, [data, editingTask, saveData]);

  /**
   * 更新子任务标题。
   */
  const updateSubTaskTitle = useCallback((subTaskId: string, newTitle: string) => {
    if (!editingTask) return;

    const updatedSubTasks = editingTask.subTasks.map(st =>
      st.id === subTaskId ? { ...st, title: newTitle } : st
    );
    setEditingTask({ ...editingTask, subTasks: updatedSubTasks });
  }, [editingTask]);

  /**
   * 更新子任务截止日期。
   */
  const updateSubTaskDate = useCallback((subTaskId: string, newDate: string) => {
    if (!editingTask) return;

    const updatedSubTasks = editingTask.subTasks.map(st =>
      st.id === subTaskId ? { ...st, dueDate: newDate } : st
    );
    setEditingTask({ ...editingTask, subTasks: updatedSubTasks });
  }, [editingTask]);

  /**
   * 添加一个空的子任务。
   */
  const addEmptySubTask = useCallback(() => {
    if (!editingTask) return;

    const newSub: SubTask = {
      id: `sub-new-${Date.now()}`,
      title: '',
      isCompleted: false,
    };
    setEditingTask({ ...editingTask, subTasks: [...editingTask.subTasks, newSub] });
  }, [editingTask]);

  /**
   * 删除指定的子任务。
   */
  const deleteSubTask = useCallback((subTaskId: string) => {
    if (!editingTask) return;

    const updatedSubTasks = editingTask.subTasks.filter(st => st.id !== subTaskId);
    setEditingTask({ ...editingTask, subTasks: updatedSubTasks });
  }, [editingTask]);

  /**
   * 调用 AI 服务生成案件摘要。
   */
  const handleGenerateAiOverview = useCallback(async () => {
    if (!editingTask) return;
    setIsOverviewGenerating(true);
    try {
      const summary = await summarizeTask(editingTask.title, editingTask.description, lang);
      setEditingTask({ ...editingTask, aiSummary: summary });
    } catch (err) {
      logError(err, 'handleGenerateAiOverview');
    } finally {
      setIsOverviewGenerating(false);
    }
  }, [editingTask, lang]);

  /**
   * 保存正在编辑的案件到主数据中并关闭模态框。
   */
  const saveEditedTask = useCallback(() => {
    if (!editingTask) return;
    saveData({ ...data, tasks: { ...data.tasks, [editingTask.id]: editingTask } });
    setEditingTask(null);
  }, [editingTask, data, saveData]);

  return {
    data,                     // 看板数据
    editingTask,              // 当前编辑的案件
    isOverviewGenerating,     // AI 生成状态
    setEditingTask,           // 设置编辑案件
    onDragEnd,                // 拖拽结束处理
    toggleSubTask,            // 切换子任务状态
    updateSubTaskTitle,       // 更新子任务标题
    updateSubTaskDate,        // 更新子任务日期
    addEmptySubTask,          // 添加子任务
    deleteSubTask,            // 删除子任务
    handleGenerateAiOverview, // 执行 AI 摘要生成
    saveEditedTask,           // 保存案件修改
    saveData,                 // 通用保存函数
  };
};
