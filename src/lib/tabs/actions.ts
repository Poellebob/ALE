import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { TabAction } from './definitions';
import { fileStore } from '../stores/fileStore';

export function createFileActions(
  onNew: () => void,
  onOpen: () => Promise<void>,
  onSave: () => Promise<void>,
  onSaveAs: () => Promise<void>
): TabAction[] {
  return [
    {
      id: 'new',
      label: 'New',
      action: onNew
    },
    {
      id: 'open',
      label: 'Open',
      action: onOpen
    },
    {
      id: 'save',
      label: 'Save',
      shortcut: 'Ctrl+S',
      action: onSave
    },
    {
      id: 'saveas',
      label: 'Save As',
      shortcut: 'Ctrl+Shift+S',
      action: onSaveAs
    }
  ];
}

export function createEditActions(
  onUndo: () => void,
  onRedo: () => void,
  onCut: () => void,
  onCopy: () => void,
  onPaste: () => void
): TabAction[] {
  return [
    {
      id: 'undo',
      label: 'Undo',
      shortcut: 'Ctrl+Z',
      action: onUndo
    },
    {
      id: 'redo',
      label: 'Redo',
      shortcut: 'Ctrl+Y',
      action: onRedo
    },
    {
      id: 'cut',
      label: 'Cut',
      shortcut: 'Ctrl+X',
      action: onCut
    },
    {
      id: 'copy',
      label: 'Copy',
      shortcut: 'Ctrl+C',
      action: onCopy
    },
    {
      id: 'paste',
      label: 'Paste',
      shortcut: 'Ctrl+V',
      action: onPaste
    }
  ];
}

export function createBuildActions(
  onBuild: () => void,
  isBuilding: boolean
): TabAction[] {
  return [
    {
      id: 'build',
      label: isBuilding ? 'Building...' : 'Build PDF',
      shortcut: 'Ctrl+B',
      action: onBuild,
      disabled: isBuilding
    }
  ];
}

export function createInsertActions(
  onInsert: (snippet: string) => void
): TabAction[] {
  return [
    {
      id: 'section',
      label: 'Section',
      action: () => onInsert('sec')
    },
    {
      id: 'subsection',
      label: 'Subsection',
      action: () => onInsert('ssec')
    },
    {
      id: 'figure',
      label: 'Figure',
      action: () => onInsert('fig')
    },
    {
      id: 'table',
      label: 'Table',
      action: () => onInsert('tab')
    },
    {
      id: 'reference',
      label: 'Reference',
      action: () => onInsert('ref')
    },
    {
      id: 'citation',
      label: 'Citation',
      action: () => onInsert('cite')
    },
    {
      id: 'itemize',
      label: 'Itemize',
      action: () => onInsert('-')
    },
    {
      id: 'enumerate',
      label: 'Enumerate',
      action: () => onInsert('1.')
    },
    {
      id: 'math',
      label: 'Math',
      action: () => onInsert('$$')
    }
  ];
}
