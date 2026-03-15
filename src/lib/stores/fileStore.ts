// src/lib/stores/fileStore.ts
//
// Tracks the currently open .tex file: its path on disk, its current
// in-memory content, and whether the content differs from the saved version.
//
// See docs/04-stores.md for the full state lifecycle.

import { writable } from 'svelte/store';

export interface FileState {
  /** Absolute path on disk, or null for an unsaved "Untitled" buffer. */
  path: string | null;
  /** Current editor content (may differ from disk if dirty === true). */
  content: string;
  /** True when content has been edited since the last save. */
  dirty: boolean;
}

const INITIAL: FileState = {
  path: null,
  content: '',
  dirty: false,
};

function createFileStore() {
  const { subscribe, set, update } = writable<FileState>(INITIAL);

  return {
    subscribe,

    /** Replace the entire state (used after a successful file open). */
    load(path: string, content: string) {
      set({ path, content, dirty: false });
    },

    /** Called by the editor on every keystroke. */
    setContent(content: string) {
      update((s) => ({ ...s, content, dirty: true }));
    },

    /** Called after a successful save to record the new path and clear dirty. */
    setPath(path: string) {
      update((s) => ({ ...s, path, dirty: false }));
    },

    /** Clear dirty flag without changing path (used after a save to the existing path). */
    markClean() {
      update((s) => ({ ...s, dirty: false }));
    },

    /** Reset to a blank "Untitled" buffer. */
    reset() {
      set(INITIAL);
    },
  };
}

export const fileStore = createFileStore();
