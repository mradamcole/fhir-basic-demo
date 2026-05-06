import { useEffect } from 'react';
import { AppShell } from './AppShell';
import { useAppStore } from './store';

function resolveTheme(theme: 'light' | 'dark' | 'system') {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function App() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const apply = () => document.documentElement.setAttribute('data-theme', resolveTheme(theme));
    apply();
    if (theme !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return <AppShell />;
}
