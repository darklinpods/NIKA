
import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { Layout, Plus, Search, Sparkles, BrainCircuit, BarChart3, Settings, LogOut, Loader2, X, Wand2, Moon, Sun, Languages, Filter, Phone, Briefcase, Clock, ChevronDown, ChevronRight, CheckCircle2, Circle, Scale, Gavel, FileText, ListTodo } from 'lucide-react';
import { INITIAL_DATA } from './constants';
import { BoardData, Case, Priority, SubTask } from './types';
import { translations } from './translations';
import TaskCard from './components/TaskCard';
import StatsBoard from './components/StatsBoard';
import GlobalTaskView from './components/GlobalTaskView';
import { generateTasks, suggestImprovement } from './services/geminiService';

const App: React.FC = () => {
  const [data, setData] = useState<BoardData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<'board' | 'stats' | 'tasks'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [editingTask, setEditingTask] = useState<Case | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  const t = translations[lang];

  const caseTypeTags = useMemo(() => {
    const tags = new Set<string>();
    Object.values(data.tasks).forEach((task: Case) => {
      task.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [data.tasks]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#020617';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
    }
  }, [theme]);

  const toggleColumn = (id: string) => {
    const next = new Set(collapsedColumns);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCollapsedColumns(next);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];
    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      setData({ ...data, columns: { ...data.columns, [start.id]: { ...start, taskIds: newTaskIds } } });
      return;
    }
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    setData({
      ...data,
      columns: {
        ...data.columns,
        [start.id]: { ...start, taskIds: startTaskIds },
        [finish.id]: { ...finish, taskIds: finishTaskIds },
      },
    });
  };

  const toggleSubTask = (caseId: string, subTaskId: string) => {
    const currentCase = data.tasks[caseId];
    if (!currentCase) return;
    const updatedSubTasks = currentCase.subTasks.map(st => 
      st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    const updatedCase = { ...currentCase, subTasks: updatedSubTasks };
    setData({ ...data, tasks: { ...data.tasks, [caseId]: updatedCase } });
    if (editingTask?.id === caseId) setEditingTask(updatedCase);
  };

  const saveEditedTask = () => {
    if (!editingTask) return;
    setData({ ...data, tasks: { ...data.tasks, [editingTask.id]: editingTask } });
    setEditingTask(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <StatsBoard data={data} theme={theme} lang={lang} />;
      case 'tasks':
        return (
          <GlobalTaskView 
            data={data} 
            theme={theme} 
            lang={lang} 
            onToggleTask={toggleSubTask}
            onOpenCase={(caseObj) => setEditingTask(caseObj)}
          />
        );
      default:
        return (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{t.sprintBoard}</h2>
                <p className="text-slate-500 text-sm">{t.managingTasks.replace('{count}', Object.keys(data.tasks).length.toString())}</p>
              </div>
              <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700">
                <Plus size={20} />{t.addTask}
              </button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex flex-col gap-10">
                {data.columnOrder.map((columnId) => {
                  const column = data.columns[columnId];
                  const isCollapsed = collapsedColumns.has(columnId);
                  const tasks = column.taskIds
                    .map(id => data.tasks[id])
                    .filter(c => c && (c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.caseNo.toLowerCase().includes(searchQuery.toLowerCase())));

                  return (
                    <div key={column.id} className={`p-5 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100/50'}`}>
                      <button onClick={() => toggleColumn(column.id)} className="flex items-center gap-3 mb-5 font-bold group">
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
                                <TaskCard key={task.id} task={task} index={index} onEdit={setEditingTask} theme={theme} lang={lang} />
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
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <aside className={`w-20 lg:w-64 flex flex-col p-6 hidden sm:flex border-r transition-all duration-300 ${
        theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Scale size={24} />
          </div>
          <h1 className={`text-xl font-bold hidden lg:block ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.title}</h1>
        </div>
        <nav className="flex-1 space-y-4">
          <button onClick={() => setActiveTab('board')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all ${activeTab === 'board' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-slate-100'}`}>
            <BrainCircuit size={20} /><span className="font-medium hidden lg:block">{t.myBoards}</span>
          </button>
          <button onClick={() => setActiveTab('tasks')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all ${activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-slate-100'}`}>
            <ListTodo size={20} /><span className="font-medium hidden lg:block">{t.taskView}</span>
          </button>
          <button onClick={() => setActiveTab('stats')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-slate-100'}`}>
            <BarChart3 size={20} /><span className="font-medium hidden lg:block">{t.analytics}</span>
          </button>
        </nav>
        <div className={`pt-6 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
          <button className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-900 hover:text-slate-200' : 'hover:bg-slate-100 hover:text-slate-900'}`}>
            <Settings size={20} /><span className="font-medium hidden lg:block">{t.settings}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`h-20 border-b flex items-center justify-between px-8 shrink-0 ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-6 flex-1">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all ${theme === 'dark' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-slate-100 text-slate-900'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="p-2 text-xs font-bold uppercase tracking-tighter hover:text-indigo-500">{lang}</button>
             <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
               {theme === 'light' ? <Moon size={20} /> : <Sun size={20} className="text-amber-400" />}
             </button>
             <div className="flex items-center gap-3 ml-4">
               <p className="text-sm font-bold hidden sm:block">{t.lawyerName}</p>
               <img src="https://picsum.photos/seed/lawyer/40/40" className="w-10 h-10 rounded-full border-2 border-indigo-500/50" alt="profile" />
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
           <div className="max-w-[1600px] mx-auto">
             {renderContent()}
           </div>
        </div>
      </main>

      {editingTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
           <div className={`w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border flex h-[85vh] animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
              
              <div className={`w-1/3 border-r p-8 flex flex-col ${theme === 'dark' ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Gavel size={24} /></div>
                    <h2 className="text-xl font-bold">{t.editTask}</h2>
                 </div>
                 
                 <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.caseNo}</label>
                      <input 
                        className={`w-full mt-1 bg-transparent border-b font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'}`}
                        value={editingTask.caseNo}
                        onChange={(e) => setEditingTask({...editingTask, caseNo: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.clientName}</label>
                      <input 
                        className={`w-full mt-1 bg-transparent border-b font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'}`}
                        value={editingTask.clientName}
                        onChange={(e) => setEditingTask({...editingTask, clientName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.description}</label>
                      <textarea 
                        rows={5}
                        className={`w-full mt-2 p-3 rounded-xl text-sm border outline-none resize-none ${theme === 'dark' ? 'bg-slate-950 border-white/5 text-slate-300' : 'bg-white border-slate-100'}`}
                        value={editingTask.description}
                        onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                      />
                    </div>

                    <div className="pt-4 border-t border-white/5">
                       <h4 className="text-xs font-bold text-indigo-500 flex items-center gap-2 mb-3">
                         <Sparkles size={14} /> AI 辅助办案
                       </h4>
                       <div className="grid grid-cols-2 gap-3">
                          <button className={`p-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-2 border transition-all ${theme === 'dark' ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/10' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>
                             <FileText size={18} /> {t.legalResearch}
                          </button>
                          <button className={`p-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-2 border transition-all ${theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                             <CheckCircle2 size={18} /> {t.evidenceCheck}
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="pt-6 mt-6 border-t border-white/5 flex gap-3">
                    <button onClick={() => setEditingTask(null)} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-700 transition-colors">{t.cancel}</button>
                    <button onClick={saveEditedTask} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all">{t.saveChanges}</button>
                 </div>
              </div>

              <div className="flex-1 p-8 flex flex-col">
                 <div className="flex justify-between items-center mb-8">
                    <div>
                       <h3 className="text-lg font-bold">{t.subTasks}</h3>
                       <p className="text-xs text-slate-500">管理流程中的关键节点与调查待办</p>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-rose-500 transition-colors" onClick={() => setEditingTask(null)}><X size={24} /></button>
                 </div>

                 <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-4">
                    {editingTask.subTasks.map(st => (
                      <div 
                        key={st.id} 
                        onClick={() => toggleSubTask(editingTask.id, st.id)}
                        className={`p-4 rounded-2xl flex items-center justify-between border cursor-pointer transition-all ${
                          st.isCompleted 
                            ? (theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100')
                            : (theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-indigo-500/30' : 'bg-white border-slate-100 hover:border-indigo-200')
                        }`}
                      >
                         <div className="flex items-center gap-3">
                            {st.isCompleted ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} className="text-slate-400" />}
                            <span className={`text-sm font-medium ${st.isCompleted ? 'line-through text-slate-500' : ''}`}>{st.title}</span>
                         </div>
                         {st.dueDate && (
                           <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                             <Clock size={12} />
                             {new Date(st.dueDate).toLocaleDateString()}
                           </div>
                         )}
                      </div>
                    ))}
                    
                    <button className={`w-full p-4 rounded-2xl border border-dashed flex items-center justify-center gap-2 text-sm font-bold transition-all ${theme === 'dark' ? 'border-white/10 text-slate-500 hover:border-indigo-500 hover:text-indigo-400' : 'border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-500'}`}>
                       <Plus size={18} /> {t.addTaskItem}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
