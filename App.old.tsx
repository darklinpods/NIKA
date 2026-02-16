
import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { Layout, Plus, Search, Sparkles, BrainCircuit, BarChart3, Settings, LogOut, Loader2, X, Wand2, Moon, Sun, Languages, Filter, Phone, Briefcase, Clock, ChevronDown, ChevronRight, CheckCircle2, Circle, Scale, Gavel, FileText, ListTodo, Tag as TagIcon, Layers, Trash2, Calendar as CalendarIcon, Zap, User, Lock, AlertCircle } from 'lucide-react';
import { INITIAL_DATA } from './constants';
import { BoardData, Case, Priority, SubTask } from './types';
import { translations } from './translations';
import TaskCard from './components/TaskCard';
import StatsBoard from './components/StatsBoard';
import GlobalTaskView from './components/GlobalTaskView';
import { generateTasks, suggestImprovement, summarizeTask } from './services/geminiService';

const isApproaching = (dueDate?: string) => {
  if (!dueDate) return false;
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  const hours = diff / (1000 * 60 * 60);
  return hours > 0 && hours < 24; // Approaching if due within 24 hours
};

const App: React.FC = () => {
  // Authentication State - Default to true to bypass login
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // App State
  const [data, setData] = useState<BoardData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<'board' | 'stats' | 'tasks'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isOverviewGenerating, setIsOverviewGenerating] = useState(false);
  const [editingTask, setEditingTask] = useState<Case | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  const t = translations[lang];

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#020617';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
    }
  }, [theme]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === '程腾光' && loginPassword === '888888') {
      setIsAuthenticated(true);
      setLoginError('');
      // Clear credentials after successful login for security
      setLoginPassword('');
    } else {
      setLoginError(t.loginError);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginUsername('');
    setLoginPassword('');
    setActiveTab('board');
  };

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

  const updateSubTaskTitle = (subTaskId: string, newTitle: string) => {
    if (!editingTask) return;
    const updatedSubTasks = editingTask.subTasks.map(st => 
      st.id === subTaskId ? { ...st, title: newTitle } : st
    );
    setEditingTask({ ...editingTask, subTasks: updatedSubTasks });
  };

  const updateSubTaskDate = (subTaskId: string, newDate: string) => {
    if (!editingTask) return;
    const updatedSubTasks = editingTask.subTasks.map(st => 
      st.id === subTaskId ? { ...st, dueDate: newDate } : st
    );
    setEditingTask({ ...editingTask, subTasks: updatedSubTasks });
  };

  const addEmptySubTask = () => {
    if (!editingTask) return;
    const newSub: SubTask = {
      id: `sub-new-${Date.now()}`,
      title: '',
      isCompleted: false,
    };
    setEditingTask({ ...editingTask, subTasks: [...editingTask.subTasks, newSub] });
  };

  const deleteSubTask = (subTaskId: string) => {
    if (!editingTask) return;
    const updatedSubTasks = editingTask.subTasks.filter(st => st.id !== subTaskId);
    setEditingTask({ ...editingTask, subTasks: updatedSubTasks });
  };

  const handleGenerateAiOverview = async () => {
    if (!editingTask) return;
    setIsOverviewGenerating(true);
    try {
      const summary = await summarizeTask(editingTask.title, editingTask.description, lang);
      setEditingTask({ ...editingTask, aiSummary: summary });
    } catch (err) {
      console.error(err);
    } finally {
      setIsOverviewGenerating(false);
    }
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
                    .filter(c => c && (c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.clientName.toLowerCase().includes(searchQuery.toLowerCase())));

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

  // --------------------------------------------------------------------------
  // LOGIN SCREEN
  // --------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#020617] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        
        {/* Top Right Controls (Theme & Lang) */}
        <div className="absolute top-6 right-8 flex items-center gap-4">
           <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="p-2 text-xs font-bold uppercase tracking-tighter hover:text-indigo-500 transition-colors">{lang}</button>
           <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
             {theme === 'light' ? <Moon size={20} /> : <Sun size={20} className="text-amber-400" />}
           </button>
        </div>

        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 mb-6">
              <Scale size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">{t.welcomeBack}</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.loginSubtitle}</p>
          </div>

          <form onSubmit={handleLogin} className={`p-8 rounded-[2rem] shadow-2xl border backdrop-blur-xl ${theme === 'dark' ? 'bg-slate-900/80 border-white/10 shadow-black/50' : 'bg-white/80 border-slate-200 shadow-slate-200/50'}`}>
            <div className="space-y-6">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.usernameLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => { setLoginUsername(e.target.value); setLoginError(''); }}
                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-slate-950/50 text-white border border-white/5 focus:border-indigo-500 focus:bg-slate-950' 
                        : 'bg-slate-50 text-slate-900 border border-slate-200 focus:border-indigo-500 focus:bg-white'
                    }`}
                    placeholder={t.usernamePlaceholder}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.passwordLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-slate-950/50 text-white border border-white/5 focus:border-indigo-500 focus:bg-slate-950' 
                        : 'bg-slate-50 text-slate-900 border border-slate-200 focus:border-indigo-500 focus:bg-white'
                    }`}
                    placeholder={t.passwordPlaceholder}
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2 animate-in shake duration-300">
                  <AlertCircle size={14} />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] mt-4"
              >
                {t.loginBtn}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MAIN APP SCREEN
  // --------------------------------------------------------------------------
  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <aside className={`w-64 lg:w-80 flex flex-col p-6 hidden sm:flex border-r transition-all duration-300 ${
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
        <div className={`pt-6 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'} space-y-2`}>
          <button className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-900 hover:text-slate-200' : 'hover:bg-slate-100 hover:text-slate-900'}`}>
            <Settings size={20} /><span className="font-medium hidden lg:block">{t.settings}</span>
          </button>
          <button onClick={handleLogout} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors text-rose-500 ${theme === 'dark' ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'}`}>
            <LogOut size={20} /><span className="font-medium hidden lg:block">{t.logout}</span>
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
             <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800">
               <p className="text-sm font-bold hidden sm:block">{t.lawyerName}</p>
               <div className="w-10 h-10 rounded-full border-2 border-indigo-500/50 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-sm">
                 {t.lawyerName.charAt(0)}
               </div>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
           <div className="max-w-[1600px] mx-auto">
             {renderContent()}
           </div>
        </div>
      </main>

      {/* DETAILED CASE MODAL */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
           <div className={`w-full max-w-7xl rounded-3xl shadow-2xl overflow-hidden border flex h-[90vh] animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
              
              {/* Left Panel: Primary Info & AI Overview */}
              <div className={`w-[35%] border-r p-8 flex flex-col ${theme === 'dark' ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Gavel size={24} /></div>
                    <h2 className="text-xl font-black tracking-tight flex-1 line-clamp-1">{editingTask.title}</h2>
                 </div>
                 
                 <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t.taskTitle}</label>
                      <input 
                        className={`w-full bg-transparent border-b font-bold text-base py-1 outline-none transition-colors ${theme === 'dark' ? 'border-white/10 text-slate-100 focus:border-indigo-500' : 'border-slate-200 focus:border-indigo-500'}`}
                        value={editingTask.title}
                        onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t.priority}</label>
                         <select 
                           className={`w-full bg-transparent border-b text-sm font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'}`}
                           value={editingTask.priority}
                           onChange={(e) => setEditingTask({...editingTask, priority: e.target.value as Priority})}
                         >
                           <option value="low">{t.low}</option>
                           <option value="medium">{t.medium}</option>
                           <option value="high">{t.high}</option>
                         </select>
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t.clientName}</label>
                         <input 
                           className={`w-full bg-transparent border-b text-sm font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'}`}
                           value={editingTask.clientName}
                           onChange={(e) => setEditingTask({...editingTask, clientName: e.target.value})}
                         />
                       </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t.description}</label>
                      <textarea 
                        rows={4}
                        className={`w-full p-3 rounded-xl text-xs border outline-none resize-none transition-all ${theme === 'dark' ? 'bg-slate-950 border-white/5 text-slate-300 focus:border-indigo-500/50' : 'bg-white border-slate-100 focus:border-indigo-300'}`}
                        value={editingTask.description}
                        onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                      />
                    </div>

                    {/* AI CASE OVERVIEW SECTION */}
                    <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                      <div className="flex justify-between items-center mb-3">
                         <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                           <Sparkles size={14} /> {t.aiOverview}
                         </h4>
                         <button 
                           onClick={handleGenerateAiOverview}
                           disabled={isOverviewGenerating}
                           className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 disabled:opacity-50"
                         >
                           {isOverviewGenerating ? <Loader2 size={12} className="animate-spin" /> : t.generateOverview}
                         </button>
                      </div>
                      <div className={`text-[11px] leading-relaxed italic ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                         {editingTask.aiSummary || (lang === 'zh' ? '点击上方按钮生成案件深度概况...' : 'Click button above to generate case overview...')}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t.tags}</label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {editingTask.tags.map((tag, i) => (
                           <span key={i} className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-bold border border-white/5">
                             {tag}
                           </span>
                        ))}
                      </div>
                    </div>
                 </div>

                 <div className="pt-6 mt-6 border-t border-white/5 flex gap-3">
                    <button onClick={() => setEditingTask(null)} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors uppercase tracking-widest text-[10px]">{t.cancel}</button>
                    <button onClick={saveEditedTask} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px]">{t.saveChanges}</button>
                 </div>
              </div>

              {/* Right Panel: Procedural Steps with Editing Support */}
              <div className="flex-1 p-10 flex flex-col">
                 <div className="flex justify-between items-center mb-8">
                    <div>
                       <h3 className="text-2xl font-bold">{t.subTasks}</h3>
                       <p className="text-sm text-slate-500 mt-1">{lang === 'zh' ? '点击任务名称或日期即可修改，红色标签表示即刻到期' : 'Click task name or date to edit. Red indicates approaching deadline.'}</p>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-rose-500 transition-colors" onClick={() => setEditingTask(null)}><X size={32} /></button>
                 </div>

                 <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-4">
                    {editingTask.subTasks.map(st => {
                      const approaching = isApproaching(st.dueDate);
                      return (
                        <div 
                          key={st.id} 
                          className={`group p-4 rounded-2xl flex items-center gap-4 border transition-all ${
                            st.isCompleted 
                              ? (theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100')
                              : approaching 
                                ? 'bg-rose-500/5 border-rose-500/30 animate-pulse'
                                : (theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm')
                          }`}
                        >
                           <button 
                             onClick={() => toggleSubTask(editingTask.id, st.id)}
                             className="transition-transform active:scale-90 shrink-0"
                           >
                              {st.isCompleted ? <CheckCircle2 size={22} className="text-emerald-500" /> : <Circle size={22} className="text-slate-400 group-hover:text-indigo-400" />}
                           </button>

                           <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                              <input 
                                value={st.title}
                                placeholder={t.taskTitlePlaceholder}
                                onChange={(e) => updateSubTaskTitle(st.id, e.target.value)}
                                className={`flex-1 bg-transparent outline-none font-semibold text-sm transition-colors ${st.isCompleted ? 'line-through text-slate-500' : 'text-slate-100 focus:text-indigo-400'}`}
                              />
                              
                              <div className="flex items-center gap-2">
                                {approaching && !st.isCompleted && (
                                   <div className="flex items-center gap-1 text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase">
                                     <Zap size={10} className="fill-current" /> {t.approaching}
                                   </div>
                                )}
                                <div className={`relative flex items-center gap-2 px-3 py-1 rounded-lg border ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                   <CalendarIcon size={12} className="text-slate-400" />
                                   <input 
                                     type="date"
                                     value={st.dueDate ? st.dueDate.split('T')[0] : ''}
                                     onChange={(e) => updateSubTaskDate(st.id, e.target.value)}
                                     className="bg-transparent text-[11px] font-bold outline-none cursor-pointer text-slate-400 focus:text-indigo-400"
                                   />
                                </div>
                                <button 
                                  onClick={() => deleteSubTask(st.id)}
                                  className="p-2 text-slate-500 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                  title={t.deleteTask}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                           </div>
                        </div>
                      );
                    })}
                    
                    <button 
                      onClick={addEmptySubTask}
                      className={`w-full p-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 text-sm font-bold transition-all ${theme === 'dark' ? 'border-white/10 text-slate-500 hover:border-indigo-500 hover:text-indigo-400' : 'border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-500'}`}>
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
