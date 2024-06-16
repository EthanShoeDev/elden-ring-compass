import { createContext, useContext, useEffect, useState } from 'react';

type ThemePreference = 'dark' | 'light' | 'system';
type Theme = 'dark' | 'light';

type ThemeProviderState = {
  themePreference: ThemePreference;
  theme: Theme;
  setThemePreference: (theme: ThemePreference) => void;
};

const initialState: ThemeProviderState = {
  theme: 'light',
  themePreference: 'system',
  setThemePreference: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultThemePreference = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: {
  children: React.ReactNode;
  defaultThemePreference?: ThemePreference;
  storageKey?: string;
}) {
  'use no memo';
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    () =>
      (localStorage.getItem(storageKey) as ThemePreference | undefined) ??
      defaultThemePreference
  );
  const [theme, setTheme] = useState<Theme>(
    themePreference === 'system' ? 'light' : themePreference
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (themePreference === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      setTheme(systemTheme);
    } else {
      root.classList.add(themePreference);
      setTheme(themePreference);
    }
  }, [themePreference, theme, setTheme]);

  const value = {
    theme,
    themePreference,
    setThemePreference: (themePreference: ThemePreference) => {
      localStorage.setItem(storageKey, themePreference);
      setThemePreference(themePreference);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  'use no memo';

  const context = useContext(ThemeProviderContext);

  return context;
};
