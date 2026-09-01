import { useSyncExternalStore } from 'react';

/**
 * Light/dark preference.
 *
 * `system` is the default and follows the OS. It is a real third state rather
 * than a computed one: a studio on a colour-critical job wants to pin the
 * interface, and someone reviewing a scheme on a phone at dusk wants it to
 * follow the device. Both are legitimate, so neither is inferred.
 *
 * The choice is written to the root element as `data-theme`, which the
 * stylesheet keys off; `system` writes nothing and lets the media query decide.
 */
export type Theme = 'system' | 'light' | 'dark';

const KEY = 'idt.theme.v1';
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // Private browsing and blocked site data both throw. Neither is an error
    // worth surfacing: the interface simply follows the system.
  }
  return 'system';
}

let theme: Theme = read();

function paint() {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

paint();

export function setTheme(next: Theme): void {
  theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // The preference simply does not persist; the session still honours it.
  }
  paint();
  for (const l of listeners) l();
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => theme,
    () => theme,
  );
}
