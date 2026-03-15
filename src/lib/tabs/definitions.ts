export interface TabAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
}

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  actions: TabAction[];
}
