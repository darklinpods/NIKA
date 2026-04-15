import React, { useState } from 'react';
import { LoginScreen, Sidebar, Header, TaskModal, BoardView, StatsBoard, GlobalTaskView, KnowledgeBaseView } from './components';
import { useTheme, useAuth, ThemeMode } from './hooks';
import { AppProvider, useAppContext } from './providers/AppProvider';
import { Case } from './types';
import { t } from './translations';

const App: React.FC = () => {
  const { isAuthenticated, username, password, error, setUsername, setPassword, handleLogin, handleLogout } = useAuth();
  const { themeMode, actualTheme, toggleTheme } = useTheme();

  if (!isAuthenticated) {
    return (
      <LoginScreen
        username={username}
        password={password}
        error={error}
        theme={actualTheme}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
        onThemeToggle={toggleTheme}
      />
    );
  }

  return (
    <AppProvider theme={actualTheme}>
      <AppLayout
        theme={actualTheme}
        themeMode={themeMode}
        onLogout={handleLogout}
        onThemeToggle={toggleTheme}
      />
    </AppProvider>
  );
};

const AppLayout: React.FC<{
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  onLogout: () => void;
  onThemeToggle: () => void;
}> = ({ theme, themeMode, onLogout, onThemeToggle }) => {
  const { data, setData, editingTask, isOverviewGenerating, isSaving, setEditingTask, toggleSubTask, updateSubTaskTitle, updateSubTaskDate, deleteSubTask, addEmptySubTask, addCaseDocument, deleteCaseDocument, renameCaseDocument, handleGenerateAiOverview, saveEditedTask } = useAppContext();
  const [activeTab, setActiveTab] = useState<'board' | 'stats' | 'tasks' | 'knowledge'>('board');
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
      title: initialData.title || t.newCase,
      description: initialData.description || '',
      priority: initialData.priority || 'medium',
      status: 'todo',
      caseType: initialData.caseType || 'general',
      clientName: initialData.clientName || t.newClient,
      tags: initialData.tags || [],
      subTasks: [],
      order: 0,
      createdAt: new Date().toISOString(),
    });
  };

  const handleSmartImportSuccess = (importedCase: Case) => {
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
    setEditingTask(importedCase);
  };

  if (editingTask) {
    return (
      <div className={`fixed inset-0 z-50 overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <TaskModal
          task={editingTask}
          theme={theme}
          isSaving={isSaving}
          onTaskChange={(newTask) => {
            setEditingTask(newTask);
            setData((prev: any) => ({
              ...prev,
              tasks: { ...prev.tasks, [newTask.id]: newTask }
            }));
          }}
          onToggleSubTask={(subTaskId) => toggleSubTask(editingTask.id, subTaskId)}
          onUpdateSubTaskTitle={updateSubTaskTitle}
          onUpdateSubTaskDate={updateSubTaskDate}
          onDeleteSubTask={deleteSubTask}
          onAddSubTask={addEmptySubTask}
          onAddDocument={addCaseDocument}
          onDeleteDocument={deleteCaseDocument}
          onRenameDocument={renameCaseDocument}
          onRefreshCase={async () => {
            if (editingTask?.id) {
              try {
                const res = await fetch(`/api/cases/${editingTask.id}`);
                const data = await res.json();
                if (data.success && data.data) {
                  setEditingTask(data.data);
                  setData((prev: any) => ({
                    ...prev,
                    tasks: { ...prev.tasks, [data.data.id]: data.data }
                  }));
                }
              } catch (e) {
                console.error('Failed to refresh case', e);
              }
            }
          }}
          onSave={saveEditedTask}
          onClose={() => setEditingTask(null)}
        />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <StatsBoard theme={theme} />;
      case 'tasks':
        return <GlobalTaskView theme={theme} />;
      case 'knowledge':
        return <KnowledgeBaseView theme={theme} />;

      default:
        return (
          <BoardView
            theme={theme}
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
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={onLogout}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          theme={theme}
          themeMode={themeMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onThemeToggle={onThemeToggle}
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
