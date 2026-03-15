// src/lib/stores/buildStore.ts
//
// Manages the LaTeX build lifecycle: triggers the Rust `build_latex` command,
// collects streaming log lines, and records the final PDF path or error.
//
// See docs/04-stores.md for the state machine diagram.

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
  /** Absolute path to the compiled PDF, set on success. */
  pdfPath: string | null;
  /** Human-readable error message, set on failure. */
  error: string | null;
}

const INITIAL: BuildState = {
  status: 'idle',
  logs: [],
  pdfPath: null,
  error: null,
};

function createBuildStore() {
  const { subscribe, set, update } = writable<BuildState>(INITIAL);

  return {
    subscribe,

    /** Append a line received from the `build-log` Tauri event. */
    addLog(line: string, stream: 'stdout' | 'stderr') {
      update((s) => ({
        ...s,
        logs: [...s.logs, { line, stream, timestamp: Date.now() }],
      }));
    },

    reset() {
      set(INITIAL);
    },

    /**
     * Invoke `build_latex` on the currently open file.
     * Transitions: idle → building → success | error
     */
    async triggerBuild() {
      const { path } = get(fileStore);

      if (!path) {
        update((s) => ({
          ...s,
          status: 'error',
          error: 'No file is open. Save the file before building.',
        }));
        return;
      }

      // Transition to building, clear previous logs/errors
      update((s) => ({
        ...s,
        status: 'building',
        logs: [],
        error: null,
      }));

      try {
        const result = await invoke<{
          success: boolean;
          pdf_path: string | null;
          error: string | null;
        }>('build_latex', { path });

        if (result.success && result.pdf_path) {
          update((s) => ({
            ...s,
            status: 'success',
            pdfPath: result.pdf_path,
            error: null,
          }));
        } else {
          update((s) => ({
            ...s,
            status: 'error',
            error: result.error ?? 'latexmk exited with a non-zero status.',
          }));
        }
      } catch (err) {
        update((s) => ({
          ...s,
          status: 'error',
          error: String(err),
        }));
      }
    },
  };
}

export const buildStore = createBuildStore();
