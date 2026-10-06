import { createContext, useContext } from 'react';

export type ThemePreference = 'dark' | 'light' | 'system';
export type Theme = 'dark' | 'light';

export type ThemeProviderState = {
  themePreference: ThemePreference;
  theme: Theme; // resolved (system → dark|light)
  setThemePreference: (theme: ThemePreference) => void;
};

export const ThemeProviderContext = createContext<ThemeProviderState>({
  themePreference: 'system',
  theme: 'light',
  setThemePreference: () => null,
});

export function useTheme() {
  return useContext(ThemeProviderContext);
}
