import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../config/types';
import { AuthService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FadeInView } from '../../components/FadeInView';
import { COLORS } from '../../config/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleRegister = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    try {
      setLoading(true);
      const user = await AuthService.register(email.trim(), password, displayName.trim());
      setUser(user);
    } catch (error: any) {
      Alert.alert('Lỗi đăng ký', error.message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-6 pt-2">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center -ml-2">
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 16 }}>
          <FadeInView fromY={12}>
            <View className="mb-8">
              <Text
                className="text-text"
                style={{
                  fontSize: 44,
                  lineHeight: 46,
                  letterSpacing: -0.8,
                  fontWeight: '900',
                  textTransform: 'uppercase',
                }}
              >
                Become{'\n'}a Member
              </Text>
              <Text
                className="text-textSecondary mt-3"
                style={{ fontSize: 15, lineHeight: 22 }}
              >
                Tạo tài khoản để bắt đầu lưu trữ.
              </Text>
            </View>
          </FadeInView>

          <FadeInView delay={80}>
            <Input
              label="Tên hiển thị"
              placeholder="Nguyễn Văn A"
              value={displayName}
              onChangeText={setDisplayName}
            />
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
              placeholder="Ít nhất 6 ký tự"
              value={password}
              onChangeText={setPassword}
              isPassword
            />
            <Input
              label="Xác nhận mật khẩu"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
            />
          </FadeInView>

          <FadeInView delay={160}>
            <Button
              title="Đăng ký"
              variant="primary"
              onPress={handleRegister}
              isLoading={loading}
              className="mt-3 mb-4"
              uppercase
            />
            <View className="flex-row justify-center items-center">
              <Text className="text-textSecondary text-[14px]">Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text
                  className="text-text text-[14px] font-semibold"
                  style={{ textDecorationLine: 'underline' }}
                >
                  Đăng nhập
                </Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
