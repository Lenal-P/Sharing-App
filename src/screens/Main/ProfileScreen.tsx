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

const FREE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024;

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
      { text: 'Đăng xuất', style: 'destructive', onPress: () => AuthService.logout().catch(console.error) },
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
      if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: name });
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
        <View className="px-6 pt-6 pb-2">
          <Text
            className="text-textSecondary text-[12px] font-semibold mb-2"
            style={{ letterSpacing: 1, textTransform: 'uppercase' }}
          >
            Tài khoản
          </Text>
          <Text
            className="text-text"
            style={{
              fontSize: 36,
              lineHeight: 40,
              letterSpacing: -0.5,
              fontWeight: '900',
              textTransform: 'uppercase',
            }}
          >
            Hồ sơ
          </Text>
        </View>

        {/* Avatar card */}
        <View className="bg-surface mx-6 rounded-lg p-6 items-center mt-5 mb-5">
          <View className="w-20 h-20 bg-primary rounded-full justify-center items-center mb-4">
            <Text className="text-white font-semibold" style={{ fontSize: 36, letterSpacing: -0.5 }}>
              {initial}
            </Text>
          </View>
          <Text
            className="text-text font-semibold"
            style={{ fontSize: 21, letterSpacing: -0.231 }}
          >
            {user?.displayName}
          </Text>
          <Text className="text-textSecondary text-[14px] mt-1" style={{ letterSpacing: -0.224 }}>
            {user?.email}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setNewName(user?.displayName || '');
              setEditingName(true);
            }}
            className="mt-4 flex-row items-center bg-background rounded-pill px-4 h-8 border border-primaryDark"
            activeOpacity={0.85}
          >
            <Ionicons name="pencil-outline" size={13} color={COLORS.primaryDark} />
            <Text className="text-primaryDark text-[13px] font-semibold ml-1">Sửa tên</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View className="mx-6 mb-5 flex-row">
          <StatCard icon="folder-outline" value={folders.length} label="Thư mục" />
          <View className="w-3" />
          <StatCard icon="images-outline" value={totalMedia} label="File" />
          <View className="w-3" />
          <StatCard icon="cloud-done-outline" value={formatBytes(storageUsed, 0)} label="Đã dùng" />
        </View>

        {/* Storage usage bar */}
        <View className="bg-surface mx-6 rounded-lg p-5 mb-5">
          <View className="flex-row items-center mb-3">
            <Ionicons name="server-outline" size={18} color={COLORS.primary} />
            <Text
              className="text-text font-semibold ml-2"
              style={{ fontSize: 15, letterSpacing: -0.224 }}
            >
              Dung lượng
            </Text>
          </View>
          <View className="h-1.5 bg-border rounded-full overflow-hidden mb-2">
            <View
              style={{
                width: `${storagePct}%`,
                backgroundColor: storagePct > 80 ? COLORS.error : COLORS.primary,
              }}
              className="h-full rounded-full"
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-textSecondary text-[12px]">
              {formatBytes(storageUsed)} / {formatBytes(FREE_QUOTA_BYTES, 0)}
            </Text>
            <Text className="text-textMuted text-[12px]">{storagePct.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Menu */}
        <View className="bg-surface mx-6 rounded-lg overflow-hidden mb-5">
          <MenuRow
            icon="compass-outline"
            label="Xem lại hướng dẫn"
            onPress={() => setShowOnboarding(true)}
          />
          <MenuRow icon="notifications-outline" label="Thông báo" />
          <MenuRow icon="lock-closed-outline" label="Bảo mật" />
          <MenuRow icon="information-circle-outline" label="Giới thiệu" subtitle="v1.0.0" last />
        </View>

        <TouchableOpacity
          className="bg-surface mx-6 flex-row items-center justify-center py-4 rounded-lg mb-10"
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
          <Text className="text-error font-semibold text-[15px] ml-2">Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={editingName} transparent animationType="fade" onRequestClose={() => setEditingName(false)}>
        <View className="flex-1 bg-black/40 justify-center items-center px-6">
          <View className="bg-background w-full rounded-lg p-5">
            <Text
              className="text-text font-semibold mb-4"
              style={{ fontSize: 17, letterSpacing: -0.374 }}
            >
              Sửa tên hiển thị
            </Text>
            <View className="bg-surface rounded-md px-4 h-12 justify-center mb-5">
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Nhập tên mới..."
                placeholderTextColor={COLORS.textMuted as string}
                style={{ color: COLORS.text, fontSize: 17 }}
                maxLength={50}
                autoFocus
              />
            </View>
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setEditingName(false)}
                className="flex-1 bg-surface rounded-xs h-11 items-center justify-center mr-2"
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text className="text-text font-semibold text-[15px]">Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveName}
                className="flex-1 bg-primary rounded-xs h-11 items-center justify-center ml-2"
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text className="text-white font-semibold text-[15px]">
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const StatCard = ({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string | number; label: string }) => (
  <View className="flex-1 bg-surface rounded-lg p-4 items-center">
    <Ionicons name={icon} size={20} color={COLORS.primary} />
    <Text
      className="text-text font-semibold mt-2"
      style={{ fontSize: 17, letterSpacing: -0.374 }}
    >
      {value}
    </Text>
    <Text className="text-textMuted text-[12px] mt-0.5">{label}</Text>
  </View>
);

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
    activeOpacity={0.6}
  >
    <Ionicons name={icon} size={20} color={COLORS.textSecondary as string} />
    <Text className="text-text text-[15px] ml-3 flex-1">{label}</Text>
    {subtitle && <Text className="text-textMuted text-[12px] mr-2">{subtitle}</Text>}
    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted as string} />
  </TouchableOpacity>
);
