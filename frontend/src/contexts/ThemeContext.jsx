/**
 * BARBER HUB - Theme Context (Dark / Light / Auto)
 * Added in v3.8 for a world-class UX.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

const THEME_KEY = 'barber_hub_theme';
const VALID_THEMES = ['light', 'dark', 'auto'];

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return VALID_THEMES.includes(saved) ? saved : 'auto';
    } catch {
      return 'auto';
    }
  });

  // Resolve 'auto' to the current system preference.
  const resolveTheme = useCallback((t) => {
    if (t === 'auto') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return t;
  }, []);

  const [resolved, setResolved] = useState(() => resolveTheme(theme));

  // Apply to <html> so Tailwind's `dark:` variants work.
  useEffect(() => {
    const r = resolveTheme(theme);
    setResolved(r);
    try {
      const root = document.documentElement;
      if (r === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
      root.setAttribute('data-theme', r);
    } catch {}
  }, [theme, resolveTheme]);

  // Listen to system preference changes while on auto.
  useEffect(() => {
    if (theme !== 'auto') return;
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        const r = mq.matches ? 'dark' : 'light';
        setResolved(r);
        const root = document.documentElement;
        if (r === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
        root.setAttribute('data-theme', r);
      };
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    } catch {}
  }, [theme]);

  const setTheme = useCallback((t) => {
    const next = VALID_THEMES.includes(t) ? t : 'auto';
    setThemeState(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Allow use outside provider (returns safe defaults).
    return { theme: 'auto', resolved: 'light', setTheme: () => {}, cycleTheme: () => {} };
  }
  return ctx;
};
