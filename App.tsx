import React, { useState } from 'react';
import { LoginScreen, Sidebar, Header, TaskModal, BoardView, StatsBoard, GlobalTaskView } from './components';
import { useApp, useTheme, useAuth } from './hooks';
import { INITIAL_DATA } from './constants';
import { Case } from './types';

const App: React.FC = () => {
  // Authentication
  const {
    isAuthenticated,
    username,
    password,
    error,
    setUsername,
    setPassword,
    handleLogin,
    handleLogout,
  } = useAuth('zh');

  // Theme
  const { themeMode, actualTheme, setThemeMode, toggleTheme } = useTheme();

  // Language
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  // App State
  const [activeTab, setActiveTab] = useState<'board' | 'stats' | 'tasks'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  // App Hooks
  const {
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
    addCaseDocument,
    deleteCaseDocument,
  } = useApp(lang, actualTheme);

  const toggleColumn = (id: string) => {
    const next = new Set(collapsedColumns);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCollapsedColumns(next);
  };

  const handleAddTask = () => {
    const newTask: Case = {
      id: `task-${Date.now()}`,
      title: lang === 'zh' ? '新案件' : 'New Case',
      description: '',
      priority: 'medium',
      clientName: lang === 'zh' ? '新客户' : 'New Client',
      tags: [],
      subTasks: [],
      aiSummary: '',
      createdAt: new Date().toISOString(),
    };
    setEditingTask(newTask);
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <StatsBoard data={data} theme={actualTheme} lang={lang} />;
      case 'tasks':
        return (
          <GlobalTaskView
            data={data}
            theme={actualTheme}
            lang={lang}
            onToggleTask={toggleSubTask}
            onOpenCase={(caseObj) => setEditingTask(caseObj)}
          />
        );
      default:
        return (
          <BoardView
            data={data}
            theme={actualTheme}
            lang={lang}
            searchQuery={searchQuery}
            collapsedColumns={collapsedColumns}
            onDragEnd={onDragEnd}
            onToggleColumn={toggleColumn}
            onEdit={setEditingTask}
            onAddTask={handleAddTask}
          />
        );
    }
  };

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <LoginScreen
        username={username}
        password={password}
        error={error}
        theme={actualTheme}
        lang={lang}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
        onThemeToggle={toggleTheme}
        onLangToggle={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      />
    );
  }

  // MAIN APP SCREEN
  return (
    <div className={`flex h-screen overflow-hidden ${actualTheme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar
        theme={actualTheme}
        lang={lang}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          theme={actualTheme}
          themeMode={themeMode}
          lang={lang}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onThemeToggle={toggleTheme}
          onLangToggle={() => setLang(lang === 'zh' ? 'en' : 'zh')}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-[1600px] mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* DETAILED CASE MODAL */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          theme={actualTheme}
          lang={lang}
          isOverviewGenerating={isOverviewGenerating}
          onTaskChange={setEditingTask}
          onToggleSubTask={(subTaskId) => toggleSubTask(editingTask.id, subTaskId)}
          onUpdateSubTaskTitle={updateSubTaskTitle}
          onUpdateSubTaskDate={updateSubTaskDate}
          onDeleteSubTask={deleteSubTask}
          onAddSubTask={addEmptySubTask}
          onAddDocument={addCaseDocument}
          onDeleteDocument={deleteCaseDocument}
          onGenerateOverview={handleGenerateAiOverview}
          onSave={saveEditedTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
};

export default App;
