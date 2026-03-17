import React from 'react';
import { Scale, User, Lock, Moon, Sun, AlertCircle } from 'lucide-react';
import { t } from '../translations';

interface LoginScreenProps {
  username: string;
  password: string;
  error: string;
  theme: 'light' | 'dark';
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onThemeToggle: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  username, password, error, theme,
  onUsernameChange, onPasswordChange, onSubmit, onThemeToggle,
}) => {
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#020617] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="absolute top-6 right-8 flex items-center gap-4">
        <button onClick={onThemeToggle} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
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

        <form onSubmit={onSubmit} className={`p-8 rounded-[2rem] shadow-2xl border backdrop-blur-xl ${theme === 'dark' ? 'bg-slate-900/80 border-white/10 shadow-black/50' : 'bg-white/80 border-slate-200 shadow-slate-200/50'}`}>
          <div className="space-y-6">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.usernameLabel}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User size={18} className="text-slate-400" /></div>
                <input type="text" required value={username} onChange={(e) => onUsernameChange(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all ${theme === 'dark' ? 'bg-slate-950/50 text-white border border-white/5 focus:border-indigo-500 focus:bg-slate-950' : 'bg-slate-50 text-slate-900 border border-slate-200 focus:border-indigo-500 focus:bg-white'}`}
                  placeholder={t.usernamePlaceholder} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.passwordLabel}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={18} className="text-slate-400" /></div>
                <input type="password" required value={password} onChange={(e) => onPasswordChange(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all ${theme === 'dark' ? 'bg-slate-950/50 text-white border border-white/5 focus:border-indigo-500 focus:bg-slate-950' : 'bg-slate-50 text-slate-900 border border-slate-200 focus:border-indigo-500 focus:bg-white'}`}
                  placeholder={t.passwordPlaceholder} />
              </div>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2 animate-in shake duration-300">
                <AlertCircle size={14} />{error}
              </div>
            )}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] mt-4">
              {t.loginBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
