import { writable } from 'svelte/store';

export type BuildStatus = 'idle' | 'building' | 'success' | 'error';

export interface BuildLogEntry {
  line: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

export interface BuildState {
  status: BuildStatus;
  logs: BuildLogEntry[];
  pdfPath: string | null;
  error: string | null;
}

function createBuildStore() {
  const { subscribe, set, update } = writable<BuildState>({
    status: 'idle',
    logs: [],
    pdfPath: null,
    error: null
  });

  return {
    subscribe,
    start: () => update(s => ({ 
      ...s, 
      status: 'building' as BuildStatus, 
      logs: [], 
      error: null 
    })),
    addLog: (line: string, stream: 'stdout' | 'stderr') => update(s => ({
      ...s,
      logs: [...s.logs, { line, stream, timestamp: Date.now() }]
    })),
    success: (pdfPath: string) => update(s => ({
      ...s,
      status: 'success' as BuildStatus,
      pdfPath,
      error: null
    })),
    error: (errorMsg: string) => update(s => ({
      ...s,
      status: 'error' as BuildStatus,
      error: errorMsg
    })),
    reset: () => set({
      status: 'idle',
      logs: [],
      pdfPath: null,
      error: null
    })
  };
}

export const buildStore = createBuildStore();
