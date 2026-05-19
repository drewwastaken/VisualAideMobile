export const COLORS = {
  bg: '#0d0d0d',
  surface: '#1a1a1a',
  textPrimary: '#f0f0f0',
  textSecondary: '#888888',
  accent: '#00ffcc',
  accentBg: 'rgba(0, 255, 204, 0.1)',
  border: '#333333',
};

// Added missing FONT_OPTIONS array used by ReaderScreen.js to prevent runtime reference crashes
export const FONT_OPTIONS = [
  { label: 'System Default', value: 'default' },
  { label: 'System Clean', value: 'systemClean' },
  { label: 'Comic Sans (Alt)', value: 'comicSans' },
  { label: 'Verdana', value: 'verdana' },
  { label: 'Trebuchet', value: 'trebuchet' },
];

export const FONTS = {
  default: undefined,
  systemClean: 'sans-serif',
  comicSans: 'sans-serif-condensed',
  verdana: 'serif',
  trebuchet: 'sans-serif-light',
};

export const PRESETS = {
  1: { kerning: 1.5, leading: 1.6, font: 'default' },
  2: { kerning: 2.5, leading: 1.8, font: 'systemClean' },
  3: { kerning: 4.0, leading: 2.2, font: 'comicSans' },
};

export const DEFAULT_SETTINGS = {
  isActive: true,
  level: 0,
  font: 'default',
  kerning: 0,
  leading: 1.5,
};