export const APP_NAME = 'Sharing';

export const COLORS = {
  primary: '#6C63FF',
  primaryDark: '#4B44CC',
  primaryLight: '#9B95FF',
  secondary: '#FF6584',
  accent: '#43E97B',
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceAlt: '#16213E',
  card: '#1E1E3A',
  cardHover: '#252550',
  text: '#FFFFFF',
  textSecondary: '#A0A0C0',
  textMuted: '#606080',
  border: '#2A2A4A',
  success: '#43E97B',
  warning: '#FFB347',
  error: '#FF6B6B',
  gradient: {
    start: '#6C63FF',
    end: '#FF6584',
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

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
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
