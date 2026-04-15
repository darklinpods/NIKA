import React from 'react';
import { Scale, BrainCircuit, ListTodo, BarChart3, Settings, LogOut, Library } from 'lucide-react';
import { t } from '../translations';

interface SidebarProps {
  theme: 'light' | 'dark';
  activeTab: 'board' | 'stats' | 'tasks' | 'knowledge';
  onTabChange: (tab: 'board' | 'stats' | 'tasks' | 'knowledge') => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ theme, activeTab, onTabChange, onLogout }) => {

  return (
    <aside className={`w-64 lg:w-80 flex flex-col p-6 hidden sm:flex border-r transition-all duration-300 ${theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
      }`}>
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <Scale size={24} />
        </div>
        <h1 className={`text-xl font-bold hidden lg:block ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.title}</h1>
      </div>
      <nav className="flex-1 space-y-4">
        <button onClick={() => onTabChange('board')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all ${activeTab === 'board' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-slate-100'}`}>
          <BrainCircuit size={20} /><span className="font-medium hidden lg:block">{t.myBoards}</span>
        </button>
        <button onClick={() => onTabChange('tasks')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all ${activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-slate-100'}`}>
          <ListTodo size={20} /><span className="font-medium hidden lg:block">{t.taskView}</span>
        </button>
        <button onClick={() => onTabChange('knowledge')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all ${activeTab === 'knowledge' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-slate-100'}`}>
          <Library size={20} /><span className="font-medium hidden lg:block">{(t as any).knowledgeBase}</span>
        </button>

        <button onClick={() => onTabChange('stats')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : theme === 'dark' ? 'hover:bg-slate-900' : 'hover:bg-slate-100'}`}>
          <BarChart3 size={20} /><span className="font-medium hidden lg:block">{t.analytics}</span>
        </button>
      </nav>
      <div className={`pt-6 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'} space-y-2`}>
        <button className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-900 hover:text-slate-200' : 'hover:bg-slate-100 hover:text-slate-900'}`}>
          <Settings size={20} /><span className="font-medium hidden lg:block">{t.settings}</span>
        </button>
        <button onClick={onLogout} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors text-rose-500 ${theme === 'dark' ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'}`}>
          <LogOut size={20} /><span className="font-medium hidden lg:block">{t.logout}</span>
        </button>
      </div>
    </aside>
  );
};
