// src/lib/tabs/definitions.ts
// Data shapes for the menu-bar tab system.

export interface TabAction {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  /** Optional visual separator above this action */
  separator?: boolean;
}

export interface Tab {
  id: string;
  label: string;
  actions: TabAction[];
}
