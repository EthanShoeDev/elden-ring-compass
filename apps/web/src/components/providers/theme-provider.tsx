import { ScriptOnce } from '@tanstack/react-router';
import { useEffect, useSyncExternalStore } from 'react';

import { type Theme, type ThemePreference, ThemeProviderContext } from './theme-context';

/**
 * SSR-safe theme provider for TanStack Start, per the shadcn dark-mode guide
 * (docs/cloned-repos-as-docs/ui/.../dark-mode/tanstack-start.mdx).
 *
 * `ScriptOnce` injects a tiny script that sets the `light`/`dark` class on
 * <html> BEFORE React hydrates — no flash of unstyled content, and no
 * `localStorage`-at-render crash during SSR (the old provider's bug). The stored
 * preference and the OS color scheme are external stores read with
 * `useSyncExternalStore`: the server snapshot is the default, and React swaps in
 * the client snapshot right after hydration.
 *
 * API is kept compatible with existing consumers (`dark-mode-toggle.tsx`):
 * `useTheme()` → { themePreference, theme (resolved), setThemePreference }.
 */

/** Pre-hydration script (string) that applies the theme class ASAP — no FOUC. */
function getThemeScript(storageKey: string, defaultPref: ThemePreference) {
  const key = JSON.stringify(storageKey);
  const fallback = JSON.stringify(defaultPref);
  return `(function(){try{var t=localStorage.getItem(${key});if(t!=='light'&&t!=='dark'&&t!=='system'){t=${fallback}}var d=matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;var e=document.documentElement;e.classList.remove('light','dark');e.classList.add(r);e.style.colorScheme=r}catch(e){}})();`;
}

// `storage` only fires in OTHER tabs, so same-tab writes announce themselves with this event.
const PREFERENCE_CHANGED = 'theme-preference-change';

function subscribePreference(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(PREFERENCE_CHANGED, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(PREFERENCE_CHANGED, onChange);
  };
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeOsDark(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const readOsDark = () => window.matchMedia(DARK_QUERY).matches;
const serverOsDark = () => false;

export function ThemeProvider({
  children,
  defaultThemePreference = 'system',
  storageKey = 'vite-ui-theme',
}: {
  children: React.ReactNode;
  defaultThemePreference?: ThemePreference;
  storageKey?: string;
}) {
  const themePreference = useSyncExternalStore(
    subscribePreference,
    (): ThemePreference => {
      const stored = localStorage.getItem(storageKey);
      return stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : defaultThemePreference;
    },
    () => defaultThemePreference,
  );
  const osDark = useSyncExternalStore(subscribeOsDark, readOsDark, serverOsDark);
  const theme: Theme = themePreference === 'system' ? (osDark ? 'dark' : 'light') : themePreference;

  // Mirror the resolved theme onto <html> (the pre-hydration script did the first paint).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
  }, [theme]);

  const setThemePreference = (pref: ThemePreference) => {
    localStorage.setItem(storageKey, pref);
    window.dispatchEvent(new Event(PREFERENCE_CHANGED));
  };

  return (
    <ThemeProviderContext value={{ themePreference, theme, setThemePreference }}>
      <ScriptOnce>{getThemeScript(storageKey, defaultThemePreference)}</ScriptOnce>
      {children}
    </ThemeProviderContext>
  );
}
