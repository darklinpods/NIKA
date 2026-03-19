import React, { useMemo, useRef, useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus, ChevronDown, ChevronRight, Zap, Loader2, Filter } from 'lucide-react';
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
  colIndex: number;
}

const getColumnColorClass = (index: number) => {
  switch (index) {
    case 0: return { dot: 'bg-slate-300', text: 'text-slate-500', badgeInfo: 'bg-slate-100 text-slate-500' };
    case 1: return { dot: 'bg-indigo-500', text: 'text-indigo-600', badgeInfo: 'bg-indigo-50 text-indigo-600' };
    case 2: return { dot: 'bg-emerald-500', text: 'text-emerald-600', badgeInfo: 'bg-emerald-50 text-emerald-600' };
    default: return { dot: 'bg-slate-400', text: 'text-slate-500', badgeInfo: 'bg-slate-100 text-slate-500' };
  }
};

const BoardColumn: React.FC<BoardColumnProps> = ({
  columnId, column, theme, searchQuery, colIndex, collapsedColumns, onToggleColumn,
}) => {
  const { data } = useAppContext();
  const isCollapsed = collapsedColumns.has(columnId);

  const tasks = useMemo(() => {
    return column.taskIds
      .map(id => data.tasks[id])
      .filter(c => c && (c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.clientName.toLowerCase().includes(searchQuery.toLowerCase())));
  }, [column.taskIds, data.tasks, searchQuery]);

  const colors = getColumnColorClass(colIndex);

  return (
    <div className={`flex flex-col gap-4 ${isCollapsed ? 'opacity-50 h-10 overflow-hidden' : ''} ${theme === 'dark' ? 'text-slate-200' : ''}`}>
      <div className="flex items-center justify-between px-2 cursor-pointer select-none" onClick={() => onToggleColumn(columnId)}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
          <h3 className={`font-headline text-xs font-bold uppercase tracking-widest ${colors.text}`}>
            {t[column.id.replace('column-', 'backlog') as keyof typeof t] || column.title}
          </h3>
        </div>
        <span className={`text-[10px] font-headline px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : colors.badgeInfo}`}>
          {tasks.length}
        </span>
      </div>

      {!isCollapsed && (
        <Droppable droppableId={column.id} direction="vertical">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-h-[160px] items-start content-start">
              {tasks.map((task, index) => (
                <TaskCard key={task.id} task={task} index={index} theme={theme} hideProgress={colIndex >= 2} />
              ))}
              {provided.placeholder}
              {tasks.length === 0 && (
                <div className={`border border-dashed rounded-lg h-32 flex flex-col items-center justify-center gap-2 ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50 text-slate-600' : 'border-slate-300 bg-slate-100/50 text-slate-400'}`}>
                  <span className="text-[10px] font-medium font-headline uppercase tracking-widest">{t.noTasks || 'No Case'}</span>
                </div>
              )}
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
  const [visibleCols, setVisibleCols] = useState<string[]>(
    data.columnOrder.length > 1 ? [data.columnOrder[0], data.columnOrder[1]] : data.columnOrder
  );

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
        onSmartImportSuccess(response.data);
      }
    } catch (error) {
      console.error("Smart Import Failed:", error);
      alert(t.smartImportFailed);
    } finally {
      setIsImporting(false);
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
      
      {/* Breadcrumbs & Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <nav className="flex items-center gap-2 text-[10px] text-slate-400 font-headline uppercase tracking-widest mb-1">
            <span>Workspace</span>
            <ChevronRight size={10} />
            <span className="text-indigo-600 font-semibold">{t.sprintBoard}</span>
          </nav>
          <h2 className={`text-3xl font-headline font-bold tracking-tight flex items-center gap-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
            <span>{t.sprintBoard} <span className="font-light ml-2 text-slate-400">/ Case Board</span></span>
            
            {/* Column Toggles */}
            <div className="flex items-center gap-2 mt-1">
              {data.columnOrder.slice(0, 3).map((colId, idx) => {
                const column = data.columns[colId];
                if (!column) return null;
                const colTitle = t[column.id.replace('column-', 'backlog') as keyof typeof t] || column.title;
                const colors = getColumnColorClass(idx);
                const isActive = visibleCols.includes(colId);
                return (
                  <button
                    key={colId}
                    onClick={() => setVisibleCols(prev => prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId].sort((a,b) => data.columnOrder.indexOf(a) - data.columnOrder.indexOf(b)))}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                    title={colTitle}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-all border-2 ${isActive ? `bg-white ${colors.text} border-current shadow-sm` : 'border-slate-300 hover:border-slate-400'}`}>
                      {isActive && <span className={`w-2 h-2 rounded-sm ${colors.dot}`}></span>}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? (theme === 'dark' ? 'text-slate-200' : 'text-slate-700') : 'text-slate-400'}`}>
                      {colTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </h2>
        </div>
        
        {/* Quick Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSmartImportClick}
            disabled={isImporting}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            } ${isImporting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {isImporting ? t.aiParsing : t.smartImport}
          </button>
          
          <button onClick={() => onAddTask()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm">
            <Plus size={14} />
            {t.addTask}
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={`grid grid-cols-1 ${
          visibleCols.length === 1 ? 'md:grid-cols-1' :
          visibleCols.length === 2 ? 'md:grid-cols-2' :
          visibleCols.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'
        } gap-6 items-start`}>
          {data.columnOrder.filter(id => visibleCols.includes(id)).map((columnId) => {
            const index = data.columnOrder.indexOf(columnId);
            const column = data.columns[columnId];
            return (
              <BoardColumn
                key={columnId}
                columnId={columnId}
                column={column}
                colIndex={index}
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

