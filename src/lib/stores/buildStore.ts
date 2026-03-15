import { writable, get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { fileStore } from './fileStore';

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
    }),
    triggerBuild: async () => {
      const fileState = get(fileStore);
      if (!fileState.path) {
        update(s => ({ ...s, status: 'error' as BuildStatus, error: 'No file open' }));
        return;
      }

      update(s => ({ 
        ...s, 
        status: 'building' as BuildStatus, 
        logs: [], 
        error: null 
      }));

      try {
        const result = await invoke<{ success: boolean; pdf_path: string | null; error: string | null }>('build_latex', { path: fileState.path });
        
        if (result.success && result.pdf_path) {
          update(s => ({
            ...s,
            status: 'success' as BuildStatus,
            pdfPath: result.pdf_path,
            error: null
          }));
        } else {
          update(s => ({
            ...s,
            status: 'error' as BuildStatus,
            error: result.error || 'Build failed'
          }));
        }
      } catch (e) {
        update(s => ({
          ...s,
          status: 'error' as BuildStatus,
          error: String(e)
        }));
      }
    }
  };
}

export const buildStore = createBuildStore();
