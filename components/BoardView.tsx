import React, { useMemo } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { BoardData, Case } from '../types';
import { translations } from '../translations';
import TaskCard from './TaskCard';

interface BoardViewProps {
  data: BoardData;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  searchQuery: string;
  collapsedColumns: Set<string>;
  onDragEnd: (result: DropResult) => void;
  onToggleColumn: (id: string) => void;
  onEdit: (task: Case) => void;
  onAddTask: () => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  data,
  theme,
  lang,
  searchQuery,
  collapsedColumns,
  onDragEnd,
  onToggleColumn,
  onEdit,
  onAddTask,
}) => {
  const t = translations[lang];

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t.sprintBoard}</h2>
          <p className="text-slate-500 text-sm">{t.managingTasks.replace('{count}', Object.keys(data.tasks).length.toString())}</p>
        </div>
        <button onClick={onAddTask} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700">
          <Plus size={20} />{t.addTask}
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col gap-10">
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId];
            const isCollapsed = collapsedColumns.has(columnId);
            const tasks = useMemo(() => {
              return column.taskIds
                .map(id => data.tasks[id])
                .filter(c => c && (c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.clientName.toLowerCase().includes(searchQuery.toLowerCase())));
            }, [column.taskIds, data.tasks, searchQuery]);

            return (
              <div key={column.id} className={`p-5 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100/50'}`}>
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
                          <TaskCard key={task.id} task={task} index={index} onEdit={onEdit} theme={theme} lang={lang} />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </>
  );
};
