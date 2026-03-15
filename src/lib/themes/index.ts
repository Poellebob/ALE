
export type Theme = {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    editor: {
      background: string;
      text: string;
      selection: string;
      cursor: string;
    };
  };
};

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: '#ffffff',
    secondary: '#f2f2f2',
    accent: '#007acc',
    background: '#ffffff',
    text: '#000000',
    editor: {
      background: '#ffffff',
      text: '#000000',
      selection: '#d7d4f0',
      cursor: '#000000',
    },
  },
};

export const darkTheme: Theme = {
    name: 'dark',
    colors: {
        primary: '#1e1e1e',
        secondary: '#252526',
        accent: '#007acc',
        background: '#1e1e1e',
        text: '#ffffff',
        editor: {
            background: '#1e1e1e',
            text: '#ffffff',
            selection: '#264f78',
            cursor: '#ffffff',
        },
    },
};

export const themes: Record<string, Theme> = {
    light: lightTheme,
    dark: darkTheme,
};
