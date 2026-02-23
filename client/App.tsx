import React, { useState } from 'react';
import { LoginScreen, Sidebar, Header, TaskModal, BoardView, StatsBoard, GlobalTaskView } from './components';
import { useTheme, useAuth } from './hooks';
import { AppProvider, useAppContext } from './providers/AppProvider';

const MainApp: React.FC<{
  lang: 'zh' | 'en';
  theme: 'light' | 'dark';
  activeTab: 'board' | 'stats' | 'tasks';
  searchQuery: string;
  collapsedColumns: Set<string>;
  onToggleColumn: (id: string) => void;
}> = ({ lang, theme, activeTab, searchQuery, collapsedColumns, onToggleColumn }) => {
  const { data, editingTask, isOverviewGenerating, isSaving, setEditingTask, toggleSubTask, updateSubTaskTitle, updateSubTaskDate, deleteSubTask, addEmptySubTask, addCaseDocument, deleteCaseDocument, handleGenerateAiOverview, saveEditedTask } = useAppContext();

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
      aiSummary: '',
      createdAt: new Date().toISOString(),
    });
  };

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
            onToggleColumn={onToggleColumn}
            onAddTask={handleAddTask}
          />
        );
    }
  };

  return (
    <>
      {editingTask ? (
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
      ) : (
        renderContent()
      )}
    </>
  );
};

const App: React.FC = () => {
  const { isAuthenticated, username, password, error, setUsername, setPassword, handleLogin, handleLogout } = useAuth('zh');
  const { themeMode, actualTheme, toggleTheme } = useTheme();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  const [activeTab, setActiveTab] = useState<'board' | 'stats' | 'tasks'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const toggleColumn = (id: string) => {
    const next = new Set(collapsedColumns);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCollapsedColumns(next);
  };

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
            <AppProvider lang={lang} theme={actualTheme}>
              <MainApp
                lang={lang}
                theme={actualTheme}
                activeTab={activeTab}
                searchQuery={searchQuery}
                collapsedColumns={collapsedColumns}
                onToggleColumn={toggleColumn}
              />
            </AppProvider>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
