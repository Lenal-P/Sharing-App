export const APP_NAME = 'Sharing';

export const COLORS = {
  primary: '#FF6B35',
  primaryDark: '#D85A2E',
  primaryLight: '#FF9068',
  secondary: '#FFA94D',
  accent: '#2EC4B6',
  background: '#0E0E11',
  surface: '#17171C',
  surfaceAlt: '#22222A',
  card: '#1C1C22',
  cardHover: '#2A2A32',
  text: '#FFFFFF',
  textSecondary: '#B3B3B8',
  textMuted: '#6B6B73',
  border: '#2A2A32',
  success: '#4ADE80',
  warning: '#FFB84D',
  error: '#FF6B6B',
  gradient: {
    start: '#FF6B35',
    end: '#FFA94D',
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
