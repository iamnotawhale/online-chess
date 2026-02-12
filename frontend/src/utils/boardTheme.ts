// Board theme utilities
export type BoardTheme = 'green' | 'brown' | 'blue' | 'purple';

export interface BoardColors {
  light: string;
  dark: string;
}

export const BOARD_THEMES: Record<BoardTheme, BoardColors> = {
  green: {
    light: '#eeeed2',
    dark: '#739552',
  },
  brown: {
    light: '#f0d9b5',
    dark: '#b58863',
  },
  blue: {
    light: '#dee3e6',
    dark: '#8ca2ad',
  },
  purple: {
    light: '#e8e1f5',
    dark: '#9b7bb5',
  },
};

const STORAGE_KEY = 'boardTheme';

export const getBoardTheme = (): BoardTheme => {
  if (typeof window === 'undefined') return 'green';
  const stored = localStorage.getItem(STORAGE_KEY);
  return (stored as BoardTheme) || 'green';
};

export const setBoardTheme = (theme: BoardTheme): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent('boardThemeChanged', { detail: { theme } }));
};

export const getBoardColors = (theme?: BoardTheme): BoardColors => {
  const selectedTheme = theme || getBoardTheme();
  return BOARD_THEMES[selectedTheme] || BOARD_THEMES.green;
};
