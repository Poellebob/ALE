import { writable } from 'svelte/store';

export interface FileState {
  path: string | null;
  content: string;
  dirty: boolean;
}

function createFileStore() {
  const { subscribe, set, update } = writable<FileState>({
    path: null,
    content: '',
    dirty: false
  });

  return {
    subscribe,
    setPath: (path: string | null) => update(s => ({ ...s, path, dirty: false })),
    setContent: (content: string) => update(s => ({ ...s, content, dirty: true })),
    setClean: () => update(s => ({ ...s, dirty: false })),
    reset: () => set({ path: null, content: '', dirty: false }),
    load: (path: string, content: string) => set({ path, content, dirty: false })
  };
}

export const fileStore = createFileStore();
