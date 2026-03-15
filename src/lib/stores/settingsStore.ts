import { writable } from 'svelte/store';

export interface Settings {
  fontSize: number;
  fontFamily: string;
  lineNumbers: boolean;
  wordWrap: boolean;
  autoSave: boolean;
  buildOnSave: boolean;
  renderMath: boolean;
  renderFormatting: boolean;
  renderHeadings: boolean;
  theme: string;
}

const DEFAULTS: Settings = {
  fontSize: 14,
  fontFamily: 'JetBrains Mono',
  lineNumbers: true,
  wordWrap: false,
  autoSave: false,
  buildOnSave: false,
  renderMath: true,
  renderFormatting: true,
  renderHeadings: true,
  theme: 'system',
};

function load(): Settings {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem('ale-settings');
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

function persist(s: Settings): Settings {
  if (typeof localStorage === 'undefined') return s;
  try { localStorage.setItem('ale-settings', JSON.stringify(s)); } catch {}
  return s;
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<Settings>(load());
  return {
    subscribe,
    patch: (patch: Partial<Settings>) => update(s => persist({ ...s, ...patch })),
    reset: () => {
      if (typeof localStorage !== 'undefined') {
        try { localStorage.removeItem('ale-settings'); } catch {}
      }
      set({ ...DEFAULTS });
    }
  };
}

export const settingsStore = createSettingsStore();
