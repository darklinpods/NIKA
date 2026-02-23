
import { useState, useCallback, useEffect } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { BoardData, Case, SubTask, Column } from '../types';
import { INITIAL_DATA } from '../constants';
import { generateTasks, suggestImprovement, summarizeTask, generateCasePlan } from '../services/geminiService';
import { fetchCases, createCase, updateCase, deleteCase } from '../services/api';
import { translations } from '../translations';
import { handleStorageError, logError } from '../utils/errorHandler';
import { useConfirm } from '../providers/ConfirmProvider';

// Helper to transform Case[] to BoardData
const transformCasesToBoard = (cases: Case[]): BoardData => {
  const tasks: { [key: string]: Case } = {};
  const columns: { [key: string]: Column } = {
    'col-1': { id: 'col-1', title: '待办', taskIds: [] },
    'col-2': { id: 'col-2', title: '进行中', taskIds: [] },
    'col-3': { id: 'col-3', title: '已完成', taskIds: [] },
  };
  const columnOrder = ['col-1', 'col-2', 'col-3'];

  const statusMap: { [key: string]: string } = {
    'todo': 'col-1',
    'in-progress': 'col-2',
    'done': 'col-3'
  };

  cases.forEach(c => {
    const caseId = c.id;
    tasks[caseId] = c;
    const colId = (c as any).status ? statusMap[(c as any).status] || 'col-1' : 'col-1';
    columns[colId]?.taskIds.push(caseId);
  });

  return { tasks, columns, columnOrder };
};

export const useApp = (lang: 'zh' | 'en', theme: 'light' | 'dark') => {
  const t = translations[lang];

  // Board Data State
  const [data, setData] = useState<BoardData>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(true);

  // Load Data from API
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const cases = await fetchCases();
      // If no cases, use INITIAL? Or just empty.
      // transformCasesToBoard returns empty board if cases empty.
      // Maybe we want to persist initial data if empty?
      // For now just load what we have.
      setData(transformCasesToBoard(cases));
    } catch (error) {
      logError(error, 'loadData');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Current editing task
  const [editingTask, setEditingTask] = useState<Case | null>(null);
  const [isOverviewGenerating, setIsOverviewGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Drag End Handler
  const onDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    if (start === finish && source.index === destination.index) return;

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newData = {
        ...data,
        columns: {
          ...data.columns,
          [start.id]: { ...start, taskIds: newTaskIds },
        },
      };
      setData(newData);
    } else {
      const startTaskIds = Array.from(start.taskIds);
      startTaskIds.splice(source.index, 1);
      const finishTaskIds = Array.from(finish.taskIds);
      finishTaskIds.splice(destination.index, 0, draggableId);

      const newData = {
        ...data,
        columns: {
          ...data.columns,
          [start.id]: { ...start, taskIds: startTaskIds },
          [finish.id]: { ...finish, taskIds: finishTaskIds },
        },
      };
      setData(newData);
    }

    // API Update if column changed
    if (start !== finish) {
      const colToStatus: { [key: string]: string } = {
        'col-1': 'todo',
        'col-2': 'in-progress',
        'col-3': 'done'
      };
      const newStatus = colToStatus[finish.id];
      if (newStatus) {
        try {
          await updateCase(draggableId, { status: newStatus } as any);
        } catch (e) {
          logError(e, 'onDragEnd update status');
        }
      }
    }
  }, [data]);

  // Save Task (Create or Update)
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

      await loadData();
      setEditingTask(null);
    } catch (error) {
      logError(error, 'saveEditedTask');
    } finally {
      setIsSaving(false);
    }
  }, [editingTask, loadData]);

  const toggleSubTask = useCallback(async (caseId: string, subTaskId: string) => {
    const currentCase = data.tasks[caseId];
    if (!currentCase) return;

    const updatedSubTasks = currentCase.subTasks.map(st =>
      st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    const updatedCase = { ...currentCase, subTasks: updatedSubTasks };

    setData(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [caseId]: updatedCase }
    }));
    if (editingTask?.id === caseId) setEditingTask(updatedCase);

    try {
      await updateCase(caseId, { subTasks: updatedSubTasks });
    } catch (e) { logError(e, 'toggleSubTask'); }
  }, [data, editingTask]);

  const addCaseDocument = useCallback(async (doc: any) => {
    if (!editingTask) return;
    const updatedDocs = [...(editingTask.documents || []), doc];
    setEditingTask({ ...editingTask, documents: updatedDocs });
  }, [editingTask]);

  const deleteCaseDocument = useCallback((docId: string) => {
    if (!editingTask) return;
    const updatedDocs = (editingTask.documents || []).filter(d => d.id !== docId);
    setEditingTask({ ...editingTask, documents: updatedDocs });
  }, [editingTask]);

  const updateSubTaskTitle = useCallback((subTaskId: string, newTitle: string) => {
    if (!editingTask) return;
    setEditingTask(prev => prev ? ({
      ...prev,
      subTasks: prev.subTasks.map(st => st.id === subTaskId ? { ...st, title: newTitle } : st)
    }) : null);
  }, [editingTask]);

  const updateSubTaskDate = useCallback((subTaskId: string, newDate: string) => {
    if (!editingTask) return;
    setEditingTask(prev => prev ? ({
      ...prev,
      subTasks: prev.subTasks.map(st => st.id === subTaskId ? { ...st, dueDate: newDate } : st)
    }) : null);
  }, [editingTask]);

  const addEmptySubTask = useCallback(() => {
    if (!editingTask) return;
    const newSub: SubTask = { id: `sub-${Date.now()}`, title: '', isCompleted: false };
    setEditingTask(prev => prev ? ({ ...prev, subTasks: [...prev.subTasks, newSub] }) : null);
  }, [editingTask]);

  const deleteSubTask = useCallback((subTaskId: string) => {
    if (!editingTask) return;
    setEditingTask(prev => prev ? ({ ...prev, subTasks: prev.subTasks.filter(st => st.id !== subTaskId) }) : null);
  }, [editingTask]);

  const { confirm } = useConfirm();

  const handleDeleteCase = useCallback(async (caseId: string) => {
    const isConfirmed = await confirm({
      title: lang === 'zh' ? '删除确认' : 'Confirm Delete',
      message: lang === 'zh'
        ? '确定要永久删除此案件及其所有相关数据吗？此操作无法撤销。'
        : 'Are you sure you want to permanently delete this case and all related data? This action cannot be undone.',
      confirmText: lang === 'zh' ? '删除' : 'Delete',
      cancelText: lang === 'zh' ? '取消' : 'Cancel',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      await deleteCase(caseId);
      loadData();
    } catch (err) {
      logError(err, 'handleDeleteCase');
    }
  }, [loadData, lang, confirm]);

  const handleGeneratePlan = useCallback(async (caseId: string) => {
    const currentCase = data.tasks[caseId];
    if (!currentCase) return;
    try {
      const result = await generateCasePlan(currentCase.title, currentCase.description, lang);
      const newSubTasks: SubTask[] = result.subTasks.map(title => ({
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title,
        isCompleted: false
      }));
      const updatedCase = { ...currentCase, subTasks: [...currentCase.subTasks, ...newSubTasks] };
      await updateCase(caseId, { subTasks: updatedCase.subTasks });
      loadData();
    } catch (err) {
      logError(err, 'handleGeneratePlan');
    }
  }, [data.tasks, lang, loadData]);

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

  const handleUpdatePriority = useCallback(async (caseId: string, priority: string) => {
    try {
      await updateCase(caseId, { priority } as any);
      loadData();
    } catch (err) {
      logError(err, 'handleUpdatePriority');
    }
  }, [loadData]);

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
    data,
    editingTask,
    isOverviewGenerating,
    isSaving,
    setEditingTask,
    onDragEnd,
    toggleSubTask,
    updateSubTaskTitle,
    updateSubTaskDate,
    addEmptySubTask,
    deleteSubTask,
    handleGenerateAiOverview,
    saveEditedTask,
    saveData: () => { },
    addCaseDocument,
    deleteCaseDocument,
    handleDeleteCase,
    handleGeneratePlan,
    handleUpdatePriority,
    handleMoveStage,
  };
};
