import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../config/types';
import { AuthService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
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
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu');
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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View className="mb-10 items-center">
            <Text className="text-4xl font-bold text-primary mb-2">Sharing</Text>
            <Text className="text-textSecondary text-base text-center">
              Lưu trữ và chia sẻ khoảnh khắc của bạn
            </Text>
          </View>

          <Input
            label="Email"
            placeholder="Nhập email của bạn"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          <TouchableOpacity
            className="self-end mb-6 mt-2"
            onPress={async () => {
              if (!email.trim()) {
                Alert.alert('Quên mật khẩu', 'Vui lòng nhập email ở trên trước rồi bấm lại.');
                return;
              }
              try {
                await AuthService.sendPasswordReset(email.trim());
                Alert.alert(
                  'Đã gửi email',
                  `Link đặt lại mật khẩu đã được gửi tới ${email.trim()}. Kiểm tra hộp thư của bạn.`
                );
              } catch (err: any) {
                Alert.alert('Lỗi', err?.message || 'Không gửi được email đặt lại');
              }
            }}
          >
            <Text className="text-primary font-medium">Quên mật khẩu?</Text>
          </TouchableOpacity>

          <Button 
            title="Đăng nhập" 
            onPress={handleLogin} 
            isLoading={loading}
            className="mb-6"
          />

          <View className="flex-row justify-center items-center">
            <Text className="text-textSecondary">Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text className="text-primary font-bold">Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
