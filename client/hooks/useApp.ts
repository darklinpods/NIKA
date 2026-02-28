import { useBoardData } from './useBoardData';
import { useTaskOperations } from './useTaskOperations';
import { useDragAndDrop } from './useDragAndDrop';
import { useAIFeatures } from './useAIFeatures';
import { useConfirm } from '../providers/ConfirmProvider';

export const useApp = (lang: 'zh' | 'en', theme: 'light' | 'dark') => {
  // 1. Core Data
  const { data, setData, isLoading, loadData } = useBoardData();

  // 2. Global Confirm Dialog
  const { confirm } = useConfirm();

  // 3. Task CRUD and UI Operations
  const {
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
  } = useTaskOperations(data, setData, loadData, confirm, lang);

  // 4. Drag & Drop interactions
  const { onDragEnd } = useDragAndDrop(data, setData);

  // 5. AI Features
  const {
    isOverviewGenerating,
    handleGeneratePlan,
    handleGenerateAiOverview
  } = useAIFeatures(data, loadData, editingTask, setEditingTask, lang);

  return {
    data,
    editingTask,
    isOverviewGenerating,
    isSaving,
    isLoading,
    setEditingTask,
    onDragEnd,
    toggleSubTask,
    updateSubTaskTitle,
    updateSubTaskDate,
    addEmptySubTask,
    deleteSubTask,
    handleGenerateAiOverview,
    saveEditedTask,
    saveData: () => { }, // Stub for potential future use or backward compatibility
    addCaseDocument,
    deleteCaseDocument,
    handleDeleteCase,
    handleGeneratePlan,
    handleUpdatePriority,
    handleMoveStage,
    handleUpdateCaseType,
  };
};
