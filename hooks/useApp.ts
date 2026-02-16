import { useState, useCallback, useMemo } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { BoardData, Case, SubTask } from '../types';
import { INITIAL_DATA } from '../constants';
import { generateTasks, suggestImprovement, summarizeTask } from '../services/geminiService';
import { translations } from '../translations';
import { handleStorageError, logError } from '../utils/errorHandler';

export const useApp = (lang: 'zh' | 'en', theme: 'light' | 'dark') => {
  const t = translations[lang];

  // State
  const [data, setData] = useState<BoardData>(() => {
    try {
      const saved = localStorage.getItem('boardData');
      return saved ? JSON.parse(saved) : INITIAL_DATA;
    } catch (error) {
      handleStorageError(error, 'initializeData');
      return INITIAL_DATA;
    }
  });
  const [editingTask, setEditingTask] = useState<Case | null>(null);
  const [isOverviewGenerating, setIsOverviewGenerating] = useState(false);

  // Save data to localStorage
  const saveData = useCallback((newData: BoardData) => {
    setData(newData);
    try {
      localStorage.setItem('boardData', JSON.stringify(newData));
    } catch (error) {
      handleStorageError(error, 'saveData');
    }
  }, []);

  // Drag and Drop
  const onDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      saveData({ ...data, columns: { ...data.columns, [start.id]: { ...start, taskIds: newTaskIds } } });
      return;
    }

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

  // SubTask operations
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

  const updateSubTaskTitle = useCallback((subTaskId: string, newTitle: string) => {
    if (!editingTask) return;

    const updatedSubTasks = editingTask.subTasks.map(st =>
      st.id === subTaskId ? { ...st, title: newTitle } : st
    );
    setEditingTask({ ...editingTask, subTasks: updatedSubTasks });
  }, [editingTask]);

  const updateSubTaskDate = useCallback((subTaskId: string, newDate: string) => {
    if (!editingTask) return;

    const updatedSubTasks = editingTask.subTasks.map(st =>
      st.id === subTaskId ? { ...st, dueDate: newDate } : st
    );
    setEditingTask({ ...editingTask, subTasks: updatedSubTasks });
  }, [editingTask]);

  const addEmptySubTask = useCallback(() => {
    if (!editingTask) return;

    const newSub: SubTask = {
      id: `sub-new-${Date.now()}`,
      title: '',
      isCompleted: false,
    };
    setEditingTask({ ...editingTask, subTasks: [...editingTask.subTasks, newSub] });
  }, [editingTask]);

  const deleteSubTask = useCallback((subTaskId: string) => {
    if (!editingTask) return;

    const updatedSubTasks = editingTask.subTasks.filter(st => st.id !== subTaskId);
    setEditingTask({ ...editingTask, subTasks: updatedSubTasks });
  }, [editingTask]);

  // Task operations
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

  const saveEditedTask = useCallback(() => {
    if (!editingTask) return;
    saveData({ ...data, tasks: { ...data.tasks, [editingTask.id]: editingTask } });
    setEditingTask(null);
  }, [editingTask, data, saveData]);

  return {
    data,
    editingTask,
    isOverviewGenerating,
    setEditingTask,
    onDragEnd,
    toggleSubTask,
    updateSubTaskTitle,
    updateSubTaskDate,
    addEmptySubTask,
    deleteSubTask,
    handleGenerateAiOverview,
    saveEditedTask,
    saveData,
  };
};
