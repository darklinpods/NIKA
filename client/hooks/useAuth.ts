import React, { useState, useCallback } from 'react';
import { t } from '../translations';

export const useAuth = () => {

  // 身份验证状态，初始值从 localStorage 获取以实现持久化登录
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('isAuthenticated');
    return saved === 'true';
  });

  // 登录表单相关状态
  const [username, setUsername] = useState(''); // 用户名
  const [password, setPassword] = useState(''); // 密码
  const [error, setError] = useState('');       // 登录错误消息

  /**
   * 处理登录表单提交。
   * 目前使用硬编码的凭据进行验证。
   */
  const handleLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // 验证用户名和密码
    if (username === '程腾光' && password === '888888') {
      setIsAuthenticated(true);
      setError('');
      // 将登录状态保存到本地存储
      localStorage.setItem('isAuthenticated', 'true');
      setPassword('');
    } else {
      // 验证失败时设置对应的语言错误消息
      setError(t.loginError);
    }
  }, [username, password, t]);

  /**
   * 处理用户退出登录。
   * 清除相关状态并移除本地存储中的登录标记。
   */
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    localStorage.removeItem('isAuthenticated');
  }, []);

  return {
    isAuthenticated, // 是否已验证
    username,        // 当前用户名
    password,        // 当前密码
    error,           // 错误信息
    setUsername,     // 设置用户名函数
    setPassword,     // 设置密码函数
    handleLogin,     // 登录处理函数
    handleLogout,    // 退出登录处理函数
  };
};
