import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'google_tokens_v1';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const SCOPES = ['openid', 'profile', 'email', DRIVE_SCOPE];

// Redirect URI cố định — auth proxy của Expo (đã đăng ký trong Google Cloud
// Web client). WebBrowser.openAuthSessionAsync chặn browser khi điều hướng
// đến URL này, capture fragment chứa access_token — không cần Expo proxy
// forward về app qua deep link (tránh "Something went wrong").
const REDIRECT_URI = 'https://auth.expo.io/@lenalp/sharing-app';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export interface GoogleTokens {
  accessToken: string;
  idToken?: string;
  expiresAt: number;
}

const buildAuthUrl = async (clientId: string, state: string): Promise<string> => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: SCOPES.join(' '),
    state,
    prompt: 'select_account',
    include_granted_scopes: 'true',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

const parseFragment = (url: string): Record<string, string> => {
  const fragIdx = url.indexOf('#');
  if (fragIdx === -1) return {};
  const fragment = url.slice(fragIdx + 1);
  const params: Record<string, string> = {};
  for (const pair of fragment.split('&')) {
    const [k, v] = pair.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return params;
};

/**
 * Mở Google OAuth trong WebBrowser session. Khi browser điều hướng tới
 * REDIRECT_URI, WebBrowser capture URL và đóng tab — trả về access_token
 * trong fragment. Hoạt động trong Expo Go (không cần deep link proxy forward).
 */
export const signInWithGoogle = async (): Promise<GoogleTokens | null> => {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
  if (!clientId) {
    throw new Error('EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB chưa set trong .env');
  }

  const state = Crypto.randomUUID();
  const authUrl = await buildAuthUrl(clientId, state);

  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI, {
    showInRecents: false,
  });

  if (result.type !== 'success' || !result.url) {
    if (result.type === 'cancel' || result.type === 'dismiss') return null;
    throw new Error(`OAuth cancelled or failed: ${result.type}`);
  }

  const fragment = parseFragment(result.url);
  if (fragment.error) {
    throw new Error(`Google OAuth error: ${fragment.error_description || fragment.error}`);
  }
  if (fragment.state && fragment.state !== state) {
    throw new Error('OAuth state mismatch — possible CSRF');
  }
  const accessToken = fragment.access_token;
  if (!accessToken) {
    throw new Error('Google không trả access_token');
  }

  const expiresIn = parseInt(fragment.expires_in || '3600', 10);
  return {
    accessToken,
    idToken: fragment.id_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
};

export const GoogleTokenStore = {
  async save(tokens: GoogleTokens): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
  },

  async load(): Promise<GoogleTokens | null> {
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GoogleTokens;
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async getValidAccessToken(): Promise<string | null> {
    const t = await this.load();
    if (!t) return null;
    if (Date.now() < t.expiresAt - 60_000) return t.accessToken;
    return null;
  },
};
