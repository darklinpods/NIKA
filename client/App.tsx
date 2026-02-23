import React, { useState } from 'react';
import { LoginScreen, Sidebar, Header, TaskModal, BoardView, StatsBoard, GlobalTaskView } from './components';
import { useTheme, useAuth, ThemeMode } from './hooks';
import { AppProvider, useAppContext } from './providers/AppProvider';

const App: React.FC = () => {
  const { isAuthenticated, username, password, error, setUsername, setPassword, handleLogin, handleLogout } = useAuth('zh');
  const { themeMode, actualTheme, toggleTheme } = useTheme();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

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

  return (
    <AppProvider lang={lang} theme={actualTheme}>
      <AppLayout
        theme={actualTheme}
        themeMode={themeMode}
        lang={lang}
        onLogout={handleLogout}
        onThemeToggle={toggleTheme}
        onLangToggle={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      />
    </AppProvider>
  );
};

const AppLayout: React.FC<{
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  lang: 'zh' | 'en';
  onLogout: () => void;
  onThemeToggle: () => void;
  onLangToggle: () => void;
}> = ({ theme, themeMode, lang, onLogout, onThemeToggle, onLangToggle }) => {
  const { editingTask, isOverviewGenerating, isSaving, setEditingTask, toggleSubTask, updateSubTaskTitle, updateSubTaskDate, deleteSubTask, addEmptySubTask, addCaseDocument, deleteCaseDocument, handleGenerateAiOverview, saveEditedTask } = useAppContext();
  const [activeTab, setActiveTab] = useState<'board' | 'stats' | 'tasks'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const toggleColumn = (id: string) => {
    const next = new Set(collapsedColumns);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCollapsedColumns(next);
  };

  const handleAddTask = () => {
    setEditingTask({
      id: `task-${Date.now()}`,
      title: lang === 'zh' ? '新案件' : 'New Case',
      description: '',
      priority: 'medium',
      status: 'todo',
      clientName: lang === 'zh' ? '新客户' : 'New Client',
      tags: [],
      subTasks: [],
      order: 0,
      createdAt: new Date().toISOString(),
    });
  };

  if (editingTask) {
    return (
      <div className={`fixed inset-0 z-50 overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <TaskModal
          task={editingTask}
          theme={theme}
          lang={lang}
          isOverviewGenerating={isOverviewGenerating}
          isSaving={isSaving}
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
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <StatsBoard theme={theme} lang={lang} />;
      case 'tasks':
        return <GlobalTaskView theme={theme} lang={lang} />;
      default:
        return (
          <BoardView
            theme={theme}
            lang={lang}
            searchQuery={searchQuery}
            collapsedColumns={collapsedColumns}
            onToggleColumn={toggleColumn}
            onAddTask={handleAddTask}
          />
        );
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar
        theme={theme}
        lang={lang}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={onLogout}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          theme={theme}
          themeMode={themeMode}
          lang={lang}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onThemeToggle={onThemeToggle}
          onLangToggle={onLangToggle}
        />
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-[1600px] mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
