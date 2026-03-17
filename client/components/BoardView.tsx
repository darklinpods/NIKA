import React, { useMemo, useRef, useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus, ChevronDown, ChevronRight, Zap, Loader2 } from 'lucide-react';
import { Column } from '../types';
import { t } from '../translations';
import TaskCard from './TaskCard';
import { useAppContext } from '../providers/AppProvider';
import { smartImportCase } from '../services/api';

interface BoardColumnProps {
  columnId: string;
  column: Column;
  theme: 'light' | 'dark';
  searchQuery: string;
  collapsedColumns: Set<string>;
  onToggleColumn: (id: string) => void;
}

const BoardColumn: React.FC<BoardColumnProps> = ({
  columnId, column, theme, searchQuery, collapsedColumns, onToggleColumn,
}) => {
  const { data } = useAppContext();
  const isCollapsed = collapsedColumns.has(columnId);

  const tasks = useMemo(() => {
    return column.taskIds
      .map(id => data.tasks[id])
      .filter(c => c && (c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.clientName.toLowerCase().includes(searchQuery.toLowerCase())));
  }, [column.taskIds, data.tasks, searchQuery]);

  return (
    <div className={`p-5 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100/50'}`}>
      <button onClick={() => onToggleColumn(column.id)} className="flex items-center gap-3 mb-5 font-bold group">
        <div className={`p-1 rounded-lg transition-colors ${isCollapsed ? 'bg-slate-200/50 dark:bg-slate-800' : 'bg-indigo-100 dark:bg-indigo-500/20'}`}>
          {isCollapsed ? <ChevronRight size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-indigo-500" />}
        </div>
        {t[column.id.replace('column-', 'backlog') as keyof typeof t] || column.title}
        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-500 text-xs">{tasks.length}</span>
      </button>
      {!isCollapsed && (
        <Droppable droppableId={column.id} direction="horizontal">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-wrap gap-5 min-h-[160px]">
              {tasks.map((task, index) => (
                <TaskCard key={task.id} task={task} index={index} theme={theme} />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
};

interface BoardViewProps {
  theme: 'light' | 'dark';
  searchQuery: string;
  collapsedColumns: Set<string>;
  onToggleColumn: (id: string) => void;
  onAddTask: (initialData?: any) => void;
  onSmartImportSuccess: (caseData: any) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  theme,
  searchQuery,
  collapsedColumns,
  onToggleColumn,
  onAddTask,
  onSmartImportSuccess,
}) => {
  const { data, onDragEnd } = useAppContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleSmartImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await smartImportCase(formData);

      if (response.success && response.data) {
        // The case is already persisted in DB with evidence saved.
        // Open it directly in TaskModal instead of pre-filling a new case form.
        onSmartImportSuccess(response.data);
      }
    } catch (error) {
      console.error("Smart Import Failed:", error);
      alert(t.smartImportFailed);
    } finally {
      setIsImporting(false);
      // 清空 input，以便可以重复选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx"
        className="hidden"
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.sprintBoard}</h2>
          <p className="text-slate-500 text-sm">{t.managingTasks.replace('{count}', Object.keys(data.tasks).length.toString())}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSmartImportClick}
            disabled={isImporting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all border shadow-sm ${theme === 'dark'
              ? 'bg-slate-800 border-slate-700 text-cyan-400 hover:bg-slate-700'
              : 'bg-white border-slate-200 text-cyan-600 hover:bg-slate-50 hover:border-cyan-200'
              } ${isImporting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
            {isImporting ? t.aiParsing : t.smartImport}
          </button>
          <button onClick={() => onAddTask()} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">
            <Plus size={20} />{t.addTask}
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-10">
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId];
            return (
              <BoardColumn
                key={columnId}
                columnId={columnId}
                column={data.columns[columnId]}
                theme={theme}
                searchQuery={searchQuery}
                collapsedColumns={collapsedColumns}
                onToggleColumn={onToggleColumn}
              />
            );
          })}
        </div>
      </DragDropContext>
    </>
  );
};
