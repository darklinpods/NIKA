import { useState, useEffect } from 'react';

/**
 * 主题类型
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 主题管理 Hook
 * 提供主题切换和持久化功能
 * 支持三种模式: 浅色、深色和跟随系统
 */
export const useTheme = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  // 获取实际应用的主题
  const getActualTheme = (): 'light' | 'dark' => {
    if (themeMode !== 'system') {
      return themeMode;
    }
    // 跟随系统主题
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(getActualTheme);

  // 监听系统主题变化
  useEffect(() => {
    if (themeMode !== 'system') {
      // 非系统模式下，直接使用用户选择的主题
      setActualTheme(themeMode);
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      setActualTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    // 初始化
    handleChange();

    // 监听变化
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  // 应用主题到 DOM
  useEffect(() => {
    if (actualTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#020617';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc';
    }
  }, [actualTheme, themeMode]);

  /**
   * 切换主题模式
   */
  const toggleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(themeMode);
    setThemeMode(modes[(currentIndex + 1) % modes.length]);
  };

  return { themeMode, actualTheme, setThemeMode, toggleTheme };
};
