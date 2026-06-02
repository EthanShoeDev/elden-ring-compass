import { ScriptOnce } from '@tanstack/react-router';
import { createContext, useContext, useEffect, useState } from 'react';

/**
 * SSR-safe theme provider for TanStack Start, per the shadcn dark-mode guide
 * (docs/cloned-repos-as-docs/ui/.../dark-mode/tanstack-start.mdx).
 *
 * `ScriptOnce` injects a tiny script that sets the `light`/`dark` class on
 * <html> BEFORE React hydrates — no flash of unstyled content, and no
 * `localStorage`-at-render crash during SSR (the old provider's bug). React
 * state starts at the default during SSR and reconciles from localStorage in an
 * effect on mount.
 *
 * API is kept compatible with existing consumers (`dark-mode-toggle.tsx`):
 * `useTheme()` → { themePreference, theme (resolved), setThemePreference }.
 */
type ThemePreference = 'dark' | 'light' | 'system';
type Theme = 'dark' | 'light';

type ThemeProviderState = {
  themePreference: ThemePreference;
  theme: Theme; // resolved (system → dark|light)
  setThemePreference: (theme: ThemePreference) => void;
};

const initialState: ThemeProviderState = {
  themePreference: 'system',
  theme: 'light',
  setThemePreference: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/** Pre-hydration script (string) that applies the theme class ASAP — no FOUC. */
function getThemeScript(storageKey: string, defaultPref: ThemePreference) {
  const key = JSON.stringify(storageKey);
  const fallback = JSON.stringify(defaultPref);
  return `(function(){try{var t=localStorage.getItem(${key});if(t!=='light'&&t!=='dark'&&t!=='system'){t=${fallback}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.remove('light','dark');e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`;
}

function applyTheme(pref: ThemePreference): Theme {
  const resolved: Theme =
    pref === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : pref;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({
  children,
  defaultThemePreference = 'system',
  storageKey = 'vite-ui-theme',
}: {
  children: React.ReactNode;
  defaultThemePreference?: ThemePreference;
  storageKey?: string;
}) {
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>(defaultThemePreference);
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Reconcile from localStorage on mount (client only).
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    setThemePreferenceState(
      stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : defaultThemePreference,
    );
    setMounted(true);
  }, [defaultThemePreference, storageKey]);

  // Apply the class + track resolved theme whenever the preference changes.
  useEffect(() => {
    if (!mounted) return;
    setTheme(applyTheme(themePreference));
  }, [themePreference, mounted]);

  // Follow OS changes while in 'system' mode.
  useEffect(() => {
    if (!mounted || themePreference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setTheme(applyTheme('system'));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [themePreference, mounted]);

  const setThemePreference = (pref: ThemePreference) => {
    localStorage.setItem(storageKey, pref);
    setThemePreferenceState(pref);
  };

  return (
    <ThemeProviderContext value={{ themePreference, theme, setThemePreference }}>
      <ScriptOnce>{getThemeScript(storageKey, defaultThemePreference)}</ScriptOnce>
      {children}
    </ThemeProviderContext>
  );
}

export function useTheme() {
  return useContext(ThemeProviderContext);
}
