import React from 'react';
import { Search, Moon, Sun, Monitor } from 'lucide-react';
import { translations } from '../translations';
import { ThemeMode } from '../hooks/useTheme';

interface HeaderProps {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  lang: 'zh' | 'en';
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onThemeToggle: () => void;
  onLangToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  themeMode,
  lang,
  searchQuery,
  onSearchChange,
  onThemeToggle,
  onLangToggle,
}) => {
  const t = translations[lang];

  // 获取主题图标
  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return <Sun size={20} />;
      case 'dark':
        return <Moon size={20} className="text-amber-400" />;
      case 'system':
        return <Monitor size={20} />;
    }
  };

  return (
    <header className={`h-20 border-b flex items-center justify-between px-8 shrink-0 ${theme === 'dark' ? 'bg-slate-950 border-slate-900' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-6 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all ${theme === 'dark' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-slate-100 text-slate-900'}`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={onLangToggle} className="p-2 text-xs font-bold uppercase tracking-tighter hover:text-indigo-500">{lang}</button>
        <button onClick={onThemeToggle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title={themeMode === 'system' ? t.systemTheme : (themeMode === 'light' ? t.lightTheme : t.darkTheme)}>
          {getThemeIcon()}
        </button>
        <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800">
          <p className="text-sm font-bold hidden sm:block">{t.lawyerName}</p>
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/50 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-sm">
            {t.lawyerName.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
};
