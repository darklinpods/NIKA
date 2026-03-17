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
    theme: 'light' | 'dark';
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, theme }) => {
    const appState = useApp(theme);

    return (
        <AppContext.Provider value={appState}>
            {children}
        </AppContext.Provider>
    );
};
