export const APP_NAME = 'Sharing';

// Nike Podium CDS palette — monochromatic UI, color only from photography.
// Buttons, text, borders stay black/white/grey; accents reserved for semantic.
export const COLORS = {
  // Primary = Nike Black (NOT pure black — slightly softer for reading comfort)
  primary: '#111111',
  primaryDark: '#000000',
  primaryLight: '#28282A',
  // Secondary = Link blue (reserved for text links/info)
  secondary: '#1151FF',
  accent: '#111111',
  // Surfaces
  background: '#FFFFFF',
  surface: '#F5F5F5',       // grey-100 — card bg, input bg, skeleton
  surfaceAlt: '#FAFAFA',    // grey-50 — snow, subtle surface
  card: '#FFFFFF',
  cardHover: '#E5E5E5',     // grey-200 — hover bg
  // Text
  text: '#111111',
  textSecondary: '#707072', // grey-500 — metadata, captions
  textMuted: '#9E9EA0',     // grey-400 — disabled/tertiary
  // Borders
  border: '#CACACB',        // grey-300 — subtle divider, input border
  borderActive: '#111111',
  // Semantic
  success: '#007D48',       // green-600
  warning: '#FCA600',       // orange-500
  error: '#D30005',         // red-600 — Nike Red
  info: '#1151FF',          // blue-500
  focusRing: 'rgba(39, 93, 197, 1)',
  // Dark context (immersive)
  dark: {
    background: '#111111',
    surface: '#1F1F21',
    surfaceAlt: '#28282A',
    card: '#39393B',
    text: '#FFFFFF',
    textSecondary: '#CACACB',
    textMuted: '#9E9EA0',
  },
  gradient: {
    start: '#111111',
    end: '#28282A',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Apple SF Pro scale
export const FONT_SIZES = {
  nano: 10,
  micro: 12,
  caption: 14,
  body: 17,
  button: 17,
  subHeading: 21,
  tile: 28,
  section: 34,
  display: 40,
  hero: 56,
};

// Nike radius tokens — sharp edges on images, pills on buttons
export const BORDER_RADIUS = {
  none: 0,
  sm: 8,     // form inputs
  md: 18,    // small interactive
  lg: 20,    // containers, cards with UI
  search: 24, // search inputs
  pill: 30,  // buttons, tags, filters
  full: 9999,
};

export const STORAGE_KEYS = {
  USER_PREFS: '@sharing_user_prefs',
};

export const MEDIA_QUALITY = {
  IMAGE_QUALITY: 0.8,
  VIDEO_QUALITY: '480p' as const,
  MAX_DURATION: 60,
};

export const PAGINATION = {
  FOLDERS_PER_PAGE: 20,
  MEDIA_PER_PAGE: 30,
};
