// src/lib/stores/themeStore.ts
//
// Persists the user's light/dark preference in localStorage so it survives
// app restarts. The +layout.svelte subscribes and reflects the value onto
// the <html data-theme> attribute, which activates the correct CSS token set.

import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

function createThemeStore() {
  // Read persisted preference; default to 'light'
  const stored =
    (typeof localStorage !== 'undefined' && localStorage.getItem('ale-theme')) as Theme | null;
  const initial: Theme = stored ?? 'light';

  const { subscribe, set } = writable<Theme>(initial);

  return {
    subscribe,

    set(theme: Theme) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ale-theme', theme);
      }
      set(theme);
    },

    toggle() {
      // Read current value by subscribing once
      let current: Theme = 'light';
      const unsub = subscribe((v) => { current = v; });
      unsub();
      this.set(current === 'light' ? 'dark' : 'light');
    },
  };
}

export const themeStore = createThemeStore();
