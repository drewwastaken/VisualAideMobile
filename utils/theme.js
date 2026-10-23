export const COLORS = {
  bg: '#0d0d0d',
  surface: '#1a1a1a',
  textPrimary: '#f0f0f0',
  textSecondary: '#888888',
  accent: '#00ffcc',
  accentBg: 'rgba(0, 255, 204, 0.1)',
  border: '#333333',
};

export const CONTRAST_PRESETS = {
  default: { label: 'Default Dark', bg: COLORS.bg, surface: COLORS.surface, text: COLORS.textPrimary, accent: COLORS.accent },
  softCream: { label: 'Soft Cream', bg: '#FDF6E3', surface: '#F4ECD7', text: '#302B24', accent: '#6B5B2E' },
  warmPeach: { label: 'Warm Peach', bg: '#FCE8DF', surface: '#F5D9CE', text: '#352622', accent: '#875442' },
  calmMint: { label: 'Calm Mint', bg: '#E6F3E8', surface: '#D5E7D8', text: '#20332A', accent: '#2D7253' },
  navyNight: { label: 'Navy Night', bg: '#111A2B', surface: '#1B2940', text: '#E8EFFF', accent: '#83B6FF' },
  charcoalDark: { label: 'Charcoal Dark', bg: '#202020', surface: '#2C2C2C', text: '#F0F0F0', accent: COLORS.accent },
  yellowOnBlack: { label: 'Yellow on Black', bg: '#000000', surface: '#171700', text: '#FFED00', accent: '#FFED00' },
};

export const FONT_COLORS = [
  { label: 'Preset Default', value: 'default', color: null },
  { label: 'Deep Black', value: '#111111', color: '#111111' },
  { label: 'Soft Charcoal', value: '#484848', color: '#484848' },
  { label: 'Deep Navy', value: '#0F2147', color: '#0F2147' },
  { label: 'Warm Amber', value: '#8C4B08', color: '#8C4B08' },
  { label: 'Pure White', value: '#FFFFFF', color: '#FFFFFF' },
  { label: 'Custom', value: 'custom', color: null },
];

export const TINT_COLORS = [
  { label: 'Amber', value: 'amber', color: '#FFBF4A' },
  { label: 'Peach', value: 'peach', color: '#FF9A7A' },
  { label: 'Rose', value: 'rose', color: '#FF7398' },
  { label: 'Mint', value: 'mint', color: '#70D9A0' },
  { label: 'Aqua', value: 'aqua', color: '#55DDE0' },
  { label: 'Lavender', value: 'lavender', color: '#B39DDB' },
  { label: 'Cream', value: 'cream', color: '#F4E6B8' },
];

export const FONT_OPTIONS = [
  { label: 'OpenDyslexic (Specialized)', value: 'openDyslexic' },
  { label: 'Lexend (Reading Fluency)', value: 'lexend' },
  { label: 'Atkinson Hyperlegible (Clear)', value: 'atkinsonHyperlegible' },
  { label: 'Verdana (Wide Sans)', value: 'verdana' },
  { label: 'Trebuchet MS', value: 'trebuchet' },
  { label: 'Comic Sans (Legible)', value: 'comicSans' },
  { label: 'System Clean', value: 'systemClean' },
  { label: 'Default', value: 'default' },
];

export const FONTS = {
  default: undefined,
  openDyslexic: 'OpenDyslexic',
  lexend: 'Lexend',
  atkinsonHyperlegible: 'Atkinson Hyperlegible',
  systemClean: 'sans-serif',
  verdana: 'Verdana',
  trebuchet: 'Trebuchet MS',
  comicSans: 'Comic Sans MS',
};

export const PRESETS = {
  1: {
    tracking: 1.5,
    wordSpacing: 1,
    leading: 1.6,
    paragraphSpacing: 4,
    font: 'atkinsonHyperlegible',
    contrastPreset: 'softCream',
    textColor: 'default',
    leftAlign: true,
  },
  2: {
    tracking: 2.5,
    wordSpacing: 3,
    leading: 1.9,
    paragraphSpacing: 8,
    font: 'lexend',
    contrastPreset: 'calmMint',
    textColor: 'default',
    leftAlign: true,
  },
  3: {
    tracking: 4,
    wordSpacing: 5,
    leading: 2.2,
    paragraphSpacing: 12,
    font: 'openDyslexic',
    contrastPreset: 'navyNight',
    textColor: 'default',
    leftAlign: true,
  },
};

export const DEFAULT_SETTINGS = {
  isActive: true,
  level: 0,
  font: 'default',
  tracking: 0,
  wordSpacing: 0,
  leading: 1.5,
  paragraphSpacing: 0,
  leftAlign: true,
  contrastPreset: 'default',
  textColor: 'default',
  customTextColor: '#f0f0f0',
  tintColor: 'amber',
  tintIntensity: 0,
  focusMode: 'off',
  focusHeight: 120,
  bionicReading: false,
  speechRate: 1.0,
};

export const SPEECH_RATE_MIN = 0.5;
export const SPEECH_RATE_MAX = 2.0;