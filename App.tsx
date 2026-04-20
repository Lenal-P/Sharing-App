import './global.css';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';
import { useAuthStore } from './src/store/authStore';
import { useUIStore } from './src/store/uiStore';
import { AuthService } from './src/services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingModal } from './src/components/OnboardingModal';

const ONBOARDING_KEY = '@sharing_onboarding_done';

export default function App() {
  const { isAuthenticated, setUser, setLoading } = useAuthStore();
  const { showOnboarding, setShowOnboarding } = useUIStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // Tạo profile nếu thiếu (trường hợp register lỗi dở lần trước).
        const profile = await AuthService.ensureProfileForUser(firebaseUser);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const done = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!done) setShowOnboarding(true);
      } catch {}
    })();
  }, [isAuthenticated]);

  const finishOnboarding = async () => {
    setShowOnboarding(false);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    } catch {}
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator />
      <OnboardingModal visible={showOnboarding} onDone={finishOnboarding} />
    </SafeAreaProvider>
  );
}
