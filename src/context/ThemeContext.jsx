import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const resolved = theme === 'system' ? getSystemPreference() : theme;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  // Also set a data attribute for debugging
  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolved;
  return resolved === 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });
  const [isDark, setIsDark] = useState(() => {
    const t = localStorage.getItem('theme') || 'system';
    return applyTheme(t);
  });

  const setTheme = useCallback((newTheme) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
    setIsDark(applyTheme(newTheme));
  }, []);

  // Use useLayoutEffect for synchronous DOM updates before paint
  useLayoutEffect(() => {
    setIsDark(applyTheme(theme));
  }, [theme]);

  // Listen for OS preference changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function handleChange() {
      if (theme === 'system') {
        setIsDark(applyTheme('system'));
      }
    }
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
