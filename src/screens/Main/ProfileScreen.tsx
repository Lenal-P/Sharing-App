import { View, Text, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { useAuthStore } from '../../store/authStore';
import { AuthService } from '../../services/auth.service';
import { FirestoreService } from '../../services/firestore.service';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/constants';
import { formatBytes } from '../../utils/formatters';
import { auth } from '../../config/firebase';
import { useFolderStore } from '../../store/folderStore';
import { useUIStore } from '../../store/uiStore';

const FREE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB (Firebase Storage free tier)

export const ProfileScreen = () => {
  const { user, setUser } = useAuthStore();
  const { folders } = useFolderStore();
  const setShowOnboarding = useUIStore((s) => s.setShowOnboarding);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);

  const storageUsed = user?.storageUsed || 0;
  const storagePct = Math.min(100, (storageUsed / FREE_QUOTA_BYTES) * 100);
  const totalMedia = folders.reduce((s, f) => s + f.mediaCount, 0);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await AuthService.logout();
          } catch (error) {
            console.error(error);
          }
        },
      },
    ]);
  };

  const handleSaveName = async () => {
    if (!user) return;
    const name = newName.trim();
    if (!name) {
      Alert.alert('Lỗi', 'Tên hiển thị không được để trống');
      return;
    }
    if (name === user.displayName) {
      setEditingName(false);
      return;
    }
    try {
      setSaving(true);
      await FirestoreService.updateUserProfile(user.uid, { displayName: name });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
      }
      setUser({ ...user, displayName: name });
      setEditingName(false);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể lưu tên');
    } finally {
      setSaving(false);
    }
  };

  const initial = user?.displayName?.charAt(0).toUpperCase() || '?';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pt-4 pb-2">
          <Text className="text-white text-2xl font-bold">Trang cá nhân</Text>
        </View>

        {/* Avatar + info */}
        <View className="bg-card mx-5 rounded-2xl p-6 items-center mt-4 mb-5">
          <View className="w-24 h-24 bg-primary rounded-full justify-center items-center mb-4">
            <Text className="text-white text-4xl font-bold">{initial}</Text>
          </View>
          <Text className="text-white text-xl font-bold">{user?.displayName}</Text>
          <Text className="text-textSecondary text-sm mt-1">{user?.email}</Text>
          <TouchableOpacity
            onPress={() => {
              setNewName(user?.displayName || '');
              setEditingName(true);
            }}
            className="mt-4 flex-row items-center bg-surfaceAlt px-4 py-2 rounded-full"
          >
            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            <Text className="text-primary text-sm font-semibold ml-1">Sửa tên</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View className="mx-5 mb-5 flex-row">
          <View className="flex-1 bg-card rounded-2xl p-4 mr-2 items-center">
            <Ionicons name="folder" size={22} color={COLORS.primary} />
            <Text className="text-white text-xl font-bold mt-2">{folders.length}</Text>
            <Text className="text-textMuted text-xs mt-0.5">Thư mục</Text>
          </View>
          <View className="flex-1 bg-card rounded-2xl p-4 mx-1 items-center">
            <Ionicons name="images" size={22} color={COLORS.secondary} />
            <Text className="text-white text-xl font-bold mt-2">{totalMedia}</Text>
            <Text className="text-textMuted text-xs mt-0.5">File</Text>
          </View>
          <View className="flex-1 bg-card rounded-2xl p-4 ml-2 items-center">
            <Ionicons name="cloud-done" size={22} color={COLORS.accent} />
            <Text className="text-white text-xl font-bold mt-2">
              {formatBytes(storageUsed, 0)}
            </Text>
            <Text className="text-textMuted text-xs mt-0.5">Đã dùng</Text>
          </View>
        </View>

        {/* Storage usage bar */}
        <View className="bg-card mx-5 rounded-2xl p-5 mb-5">
          <View className="flex-row items-center mb-3">
            <Ionicons name="pie-chart" size={22} color={COLORS.primary} />
            <Text className="text-white text-base font-semibold ml-2">Dung lượng</Text>
          </View>
          <View className="h-2 bg-border rounded-full overflow-hidden mb-2">
            <View
              style={{
                width: `${storagePct}%`,
                backgroundColor: storagePct > 80 ? COLORS.error : COLORS.primary,
              }}
              className="h-full rounded-full"
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-textSecondary text-xs">
              {formatBytes(storageUsed)} / {formatBytes(FREE_QUOTA_BYTES, 0)}
            </Text>
            <Text className="text-textMuted text-xs">{storagePct.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Menu */}
        <View className="bg-card mx-5 rounded-2xl overflow-hidden mb-5">
          <MenuRow
            icon="compass-outline"
            label="Xem lại hướng dẫn"
            onPress={() => setShowOnboarding(true)}
          />
          <MenuRow icon="notifications-outline" label="Thông báo" />
          <MenuRow icon="shield-checkmark-outline" label="Bảo mật" />
          <MenuRow icon="information-circle-outline" label="Giới thiệu" subtitle="v1.0.0" last />
        </View>

        <TouchableOpacity
          className="bg-surfaceAlt mx-5 flex-row items-center justify-center p-4 rounded-2xl mb-10"
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text className="text-error font-semibold text-base ml-2">Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit name modal */}
      <Modal visible={editingName} transparent animationType="fade" onRequestClose={() => setEditingName(false)}>
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-surface w-full rounded-2xl p-6">
            <Text className="text-white text-lg font-bold mb-4">Sửa tên hiển thị</Text>
            <View className="bg-card rounded-xl px-4 py-3 mb-5 border border-border">
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Nhập tên mới..."
                placeholderTextColor={COLORS.textMuted}
                style={{ color: COLORS.text, fontSize: 15 }}
                maxLength={50}
                autoFocus
              />
            </View>
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setEditingName(false)}
                className="flex-1 bg-surfaceAlt py-3 rounded-xl items-center mr-2"
                disabled={saving}
              >
                <Text className="text-textSecondary font-semibold">Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveName}
                className="flex-1 bg-primary py-3 rounded-xl items-center ml-2"
                disabled={saving}
              >
                <Text className="text-white font-semibold">{saving ? 'Đang lưu...' : 'Lưu'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const MenuRow = ({
  icon,
  label,
  subtitle,
  last,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  last?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    className={`flex-row items-center px-4 py-4 ${last ? '' : 'border-b border-border'}`}
    onPress={onPress ?? (() => Alert.alert(label, 'Tính năng sẽ được cập nhật trong phiên bản sau.'))}
  >
    <Ionicons name={icon} size={22} color={COLORS.textSecondary} />
    <Text className="text-white text-base ml-3 flex-1">{label}</Text>
    {subtitle && <Text className="text-textMuted text-xs mr-2">{subtitle}</Text>}
    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
  </TouchableOpacity>
);
