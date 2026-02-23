import React, { createContext, useContext, ReactNode } from 'react';
import { useApp } from '../hooks/useApp';

// 从自定义的 useApp Hook 中提取出所有的状态和方法类型
export type AppContextType = ReturnType<typeof useApp>;

// 创建全局状态上下文
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * 供子组件内快速获取全局状态的专用 Hook
 * 避免逐层传递 Props (Prop drilling)
 */
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

interface AppProviderProps {
    children: ReactNode;
    lang: 'zh' | 'en';
    theme: 'light' | 'dark';
}

/**
 * 全局状态的上下文 Provider
 * 封装了所有通过 useApp 提取出来的最新聚合状态和操作方法，并将其广播到整棵 React 组件树下
 */
export const AppProvider: React.FC<AppProviderProps> = ({ children, lang, theme }) => {
    const appState = useApp(lang, theme);

    return (
        <AppContext.Provider value={appState}>
            {children}
        </AppContext.Provider>
    );
};
