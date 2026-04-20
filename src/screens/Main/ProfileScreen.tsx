import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { AuthService } from '../../services/auth.service';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/constants';
import { formatBytes } from '../../utils/formatters';

export const ProfileScreen = () => {
  const { user } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { 
        text: 'Đăng xuất', 
        style: 'destructive',
        onPress: async () => {
          try {
            await AuthService.logout();
          } catch (error) {
            console.error(error);
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 py-6">
        <Text className="text-white text-3xl font-bold mb-8">Trang cá nhân</Text>

        <View className="bg-card rounded-2xl p-6 items-center mb-6">
          <View className="w-24 h-24 bg-primary rounded-full justify-center items-center mb-4">
            <Text className="text-white text-3xl font-bold">
              {user?.displayName?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-white text-xl font-bold mb-1">{user?.displayName}</Text>
          <Text className="text-textSecondary">{user?.email}</Text>
        </View>

        <View className="bg-card rounded-2xl p-5 mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons name="pie-chart" size={24} color={COLORS.primary} />
            <Text className="text-white text-lg font-semibold ml-3">Lưu trữ</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-textSecondary">Đã sử dụng</Text>
            <Text className="text-white font-medium">{formatBytes(user?.storageUsed || 0)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-textSecondary">Số thư mục</Text>
            <Text className="text-white font-medium">{user?.folderCount || 0}</Text>
          </View>
        </View>

        <TouchableOpacity 
          className="bg-surfaceAlt flex-row items-center p-4 rounded-xl"
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
          <Text className="text-error font-semibold text-lg ml-3">Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
