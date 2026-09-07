import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {}
});

const THEME_STORAGE_KEY = 'videogis_theme';

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      return savedTheme === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const applyTheme = (currentTheme) => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    if (document.body) {
      document.body.setAttribute('data-theme', currentTheme);
    }
  };

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    const val = newTheme === 'light' ? 'light' : 'dark';
    setThemeState(val);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, val);
    } catch (e) {
      console.warn('Unable to persist theme to localStorage', e);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
