import { useState, useCallback } from 'react';
import { translations } from '../translations';

export const useAuth = (lang: 'zh' | 'en') => {
  const t = translations[lang];
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('isAuthenticated');
    return saved === 'true';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (username === '程腾光' && password === '888888') {
      setIsAuthenticated(true);
      setError('');
      localStorage.setItem('isAuthenticated', 'true');
      setPassword('');
    } else {
      setError(t.loginError);
    }
  }, [username, password, t]);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    localStorage.removeItem('isAuthenticated');
  }, []);

  return {
    isAuthenticated,
    username,
    password,
    error,
    setUsername,
    setPassword,
    handleLogin,
    handleLogout,
  };
};
