import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../config/types';
import { AuthService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FadeInView } from '../../components/FadeInView';
import { COLORS } from '../../config/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }
    try {
      setLoading(true);
      const user = await AuthService.login(email.trim(), password);
      setUser(user);
    } catch (error: any) {
      Alert.alert('Lỗi đăng nhập', error.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Decorative shapes */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: COLORS.primary,
          opacity: 0.06,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 140,
          left: -80,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: COLORS.primary,
          opacity: 0.04,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <FadeInView fromY={12}>
            <View className="mb-10">
              <View
                style={{
                  backgroundColor: COLORS.primary,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 20,
                  alignSelf: 'flex-start',
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: '900',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Sharing
                </Text>
              </View>
              <Text
                className="text-text"
                style={{
                  fontSize: 56,
                  lineHeight: 56,
                  letterSpacing: -1,
                  fontWeight: '900',
                  textTransform: 'uppercase',
                }}
              >
                Just{'\n'}Share It
              </Text>
              <Text
                className="text-textSecondary mt-4"
                style={{ fontSize: 16, lineHeight: 24 }}
              >
                Lưu trữ. Chia sẻ. Đơn giản.
              </Text>
            </View>
          </FadeInView>

          <FadeInView delay={100}>
            <Input
              label="Email"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Mật khẩu"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              isPassword
            />
          </FadeInView>

          <FadeInView delay={180}>
            <TouchableOpacity
              className="self-end mb-6 mt-1"
              onPress={async () => {
                if (!email.trim()) {
                  Alert.alert('Quên mật khẩu', 'Vui lòng nhập email ở trên trước rồi bấm lại.');
                  return;
                }
                try {
                  await AuthService.sendPasswordReset(email.trim());
                  Alert.alert('Đã gửi email', `Link đặt lại mật khẩu đã được gửi tới ${email.trim()}.`);
                } catch (err: any) {
                  Alert.alert('Lỗi', err?.message || 'Không gửi được email đặt lại');
                }
              }}
            >
              <Text
                className="text-text text-[14px] font-semibold"
                style={{ textDecorationLine: 'underline' }}
              >
                Quên mật khẩu?
              </Text>
            </TouchableOpacity>

            <Button
              title="Đăng nhập"
              variant="primary"
              onPress={handleLogin}
              isLoading={loading}
              className="mb-3"
              uppercase
            />

            <Button
              title="Tạo tài khoản mới"
              variant="outlined"
              onPress={() => navigation.navigate('Register')}
              className="mb-4"
              uppercase
            />
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
