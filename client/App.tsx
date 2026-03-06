import React, { useState } from 'react';
import { LoginScreen, Sidebar, Header, TaskModal, BoardView, StatsBoard, GlobalTaskView, KnowledgeBaseView, ComplaintGeneratorView } from './components';
import { useTheme, useAuth, ThemeMode } from './hooks';
import { AppProvider, useAppContext } from './providers/AppProvider';
import { Case } from './types';
import { translations } from './translations';

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
  const { data, setData, editingTask, isOverviewGenerating, isSaving, setEditingTask, toggleSubTask, updateSubTaskTitle, updateSubTaskDate, deleteSubTask, addEmptySubTask, addCaseDocument, deleteCaseDocument, handleGenerateAiOverview, saveEditedTask } = useAppContext();
  const [activeTab, setActiveTab] = useState<'board' | 'stats' | 'tasks' | 'knowledge' | 'complaint'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const toggleColumn = (id: string) => {
    const next = new Set(collapsedColumns);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCollapsedColumns(next);
  };

  const handleAddTask = (initialData: Partial<Case> = {}) => {
    setEditingTask({
      id: `task-${Date.now()}`,
      title: initialData.title || translations[lang].newCase,
      description: initialData.description || '',
      priority: initialData.priority || 'medium',
      status: 'todo',
      caseType: initialData.caseType || 'general',
      clientName: initialData.clientName || translations[lang].newClient,
      tags: initialData.tags || [],
      subTasks: [],
      order: 0,
      createdAt: new Date().toISOString(),
    });
  };

  const handleSmartImportSuccess = (importedCase: Case) => {
    // Add the newly-created case to the board state (col-1 = todo)
    setData((prev: any) => {
      const newTasks = { ...prev.tasks, [importedCase.id]: importedCase };
      const newColumns = { ...prev.columns };
      const todoColId = 'col-1';
      if (newColumns[todoColId]) {
        newColumns[todoColId] = {
          ...newColumns[todoColId],
          taskIds: [...newColumns[todoColId].taskIds, importedCase.id],
        };
      }
      return { ...prev, tasks: newTasks, columns: newColumns };
    });
    // Open the case immediately in the TaskModal for review / editing
    setEditingTask(importedCase);
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
      case 'knowledge':
        return <KnowledgeBaseView theme={theme} lang={lang} />;
      case 'complaint':
        return <ComplaintGeneratorView theme={theme} lang={lang} />;
      default:
        return (
          <BoardView
            theme={theme}
            lang={lang}
            searchQuery={searchQuery}
            collapsedColumns={collapsedColumns}
            onToggleColumn={toggleColumn}
            onAddTask={handleAddTask}
            onSmartImportSuccess={handleSmartImportSuccess}
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
