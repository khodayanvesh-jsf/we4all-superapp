import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'we4all_theme_mode';

function resolveTheme(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function useWe4AllTheme() {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'light';
    } catch {
      return 'light';
    }
  });

  const resolved = resolveTheme(mode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore storage quota restrictions
    }
  }, [mode, resolved]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (resolveTheme(prev) === 'dark' ? 'light' : 'dark'));
  }, []);

  return { mode, resolved, setMode, toggleTheme };
}