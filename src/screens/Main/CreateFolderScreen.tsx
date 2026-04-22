import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../config/types';
import { COLORS } from '../../config/constants';
import { useAuthStore } from '../../store/authStore';
import { useFolderStore } from '../../store/folderStore';
import { FirestoreService } from '../../services/firestore.service';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'CreateFolder'>;
type RouteType = RouteProp<HomeStackParamList, 'CreateFolder'>;

const FOLDER_ICONS = [
  'folder', 'images', 'videocam', 'document-text',
  'star', 'heart', 'briefcase', 'school',
  'camera', 'musical-notes', 'airplane', 'gift',
] as const;

const FOLDER_COLORS = [
  '#0071E3', '#2997FF', '#28CD41', '#FF9500',
  '#FF3B30', '#AF52DE', '#FF2D92', '#5E5CE6',
];

export const CreateFolderScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { user } = useAuthStore();
  const { folders, addFolder, updateFolder } = useFolderStore();

  const editFolderId = route.params?.mode === 'edit' ? route.params?.folderId : undefined;
  const editTarget = editFolderId ? folders.find((f) => f.id === editFolderId) : undefined;
  const isEdit = !!editTarget;

  const [name, setName] = useState(editTarget?.name ?? '');
  const [description, setDescription] = useState(editTarget?.description ?? '');
  const [isPublic, setIsPublic] = useState(editTarget?.isPublic ?? false);
  const [selectedIcon, setSelectedIcon] = useState<string>(editTarget?.iconName ?? 'folder');
  const [selectedColor, setSelectedColor] = useState<string>(editTarget?.color ?? FOLDER_COLORS[0]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const hasExistingPassword = !!editTarget?.passwordHash;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên thư mục');
      return;
    }
    if (!user) return;

    try {
      setIsLoading(true);
      // Folder private có password → hash trước khi lưu
      // Folder public → xoá password nếu có
      let passwordHashPatch: string | null | undefined = undefined;
      if (!isPublic && password.trim()) {
        passwordHashPatch = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          password.trim()
        );
      } else if (isPublic) {
        passwordHashPatch = null; // xoá hash khi chuyển public
      }

      if (isEdit && editTarget) {
        const patch: any = {
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
          iconName: selectedIcon,
          color: selectedColor,
        };
        if (passwordHashPatch !== undefined) {
          patch.passwordHash = passwordHashPatch === null ? null : passwordHashPatch;
        }
        await FirestoreService.updateFolder(editTarget.id, patch);
        updateFolder(editTarget.id, {
          ...patch,
          passwordHash: passwordHashPatch === null ? undefined : passwordHashPatch,
        });
      } else {
        const newFolder = await FirestoreService.createFolder(
          {
            ownerId: user.uid,
            ownerDisplayName: user.displayName,
            name: name.trim(),
            description: description.trim() || undefined,
            iconName: selectedIcon,
            color: selectedColor,
            mediaCount: 0,
            totalSize: 0,
            isPublic,
            sharedWith: [],
            members: [],
          },
          !isPublic && password.trim() ? password.trim() : undefined
        );
        addFolder(newFolder);
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể lưu thư mục. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-row items-center px-6 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text
            className="text-text font-semibold flex-1"
            style={{ fontSize: 17, letterSpacing: -0.374 }}
          >
            {isEdit ? 'Sửa thư mục' : 'Thư mục mới'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading}
            className="bg-primary rounded-xs px-4 h-9 justify-center"
            activeOpacity={0.85}
          >
            <Text className="text-white font-semibold text-[14px]">
              {isLoading ? 'Đang lưu...' : 'Lưu'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
          {/* Preview */}
          <View className="items-center mb-10 mt-8">
            <View
              style={{ backgroundColor: selectedColor + '1A' }}
              className="w-28 h-28 rounded-xl items-center justify-center mb-3"
            >
              <Ionicons name={selectedIcon as any} size={52} color={selectedColor} />
            </View>
            <Text
              className="text-text font-semibold"
              style={{ fontSize: 21, letterSpacing: -0.231 }}
              numberOfLines={1}
            >
              {name || 'Tên thư mục'}
            </Text>
          </View>

          <Text
            className="text-textMuted text-[12px] font-medium mb-3"
            style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
          >
            Biểu tượng
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
            {FOLDER_ICONS.map((icon) => {
              const active = selectedIcon === icon;
              return (
                <TouchableOpacity
                  key={icon}
                  onPress={() => setSelectedIcon(icon)}
                  style={{
                    backgroundColor: active ? selectedColor + '1A' : COLORS.surface,
                    borderColor: active ? selectedColor : 'transparent',
                    borderWidth: 2,
                  }}
                  className="w-14 h-14 rounded-md items-center justify-center"
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={icon as any}
                    size={24}
                    color={active ? selectedColor : (COLORS.textSecondary as string)}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <Text
            className="text-textMuted text-[12px] font-medium mb-3"
            style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
          >
            Màu sắc
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
            {FOLDER_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                style={{ backgroundColor: color }}
                className="w-10 h-10 rounded-full items-center justify-center"
                activeOpacity={0.85}
              >
                {selectedColor === color && (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text
            className="text-textMuted text-[12px] font-medium mb-2"
            style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
          >
            Tên thư mục *
          </Text>
          <View className="bg-surface rounded-md px-4 h-12 justify-center mb-5">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nhập tên thư mục..."
              placeholderTextColor={COLORS.textMuted as string}
              style={{ color: COLORS.text, fontSize: 17 }}
              maxLength={50}
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
            />
          </View>

          <Text
            className="text-textMuted text-[12px] font-medium mb-2"
            style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
          >
            Mô tả (tuỳ chọn)
          </Text>
          <View className="bg-surface rounded-md px-4 py-3 mb-5 min-h-[80px]">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả ngắn..."
              placeholderTextColor={COLORS.textMuted as string}
              style={{ color: COLORS.text, fontSize: 17 }}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
            />
          </View>

          <View className="bg-surface rounded-lg px-4 py-4 flex-row items-center justify-between mb-5">
            <View className="flex-row items-center flex-1">
              <Ionicons
                name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                size={20}
                color={isPublic ? COLORS.primary : (COLORS.textMuted as string)}
              />
              <View className="ml-3 flex-1">
                <Text className="text-text font-semibold text-[15px]">
                  {isPublic ? 'Công khai' : 'Riêng tư'}
                </Text>
                <Text className="text-textMuted text-[12px] mt-0.5">
                  {isPublic
                    ? 'Ai cũng thấy trong Feed công khai'
                    : 'Phải nhập mã (+ mật khẩu nếu có) để join'}
                </Text>
              </View>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#E5E5EA', true: COLORS.primary }}
              thumbColor={'#fff'}
            />
          </View>

          {/* Password field — chỉ hiện khi folder private */}
          {!isPublic && (
            <View className="mb-8">
              <Text
                className="text-textMuted text-[12px] font-medium mb-2"
                style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
              >
                Mật khẩu join (tuỳ chọn)
              </Text>
              <View
                className="bg-surface flex-row items-center px-4 h-12"
                style={{ borderRadius: 11 }}
              >
                <Ionicons name="key-outline" size={18} color={COLORS.textSecondary} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={
                    hasExistingPassword ? 'Nhập mới để đổi, để trống giữ cũ' : 'Mật khẩu cho người join'
                  }
                  placeholderTextColor={COLORS.textMuted as string}
                  style={{ color: COLORS.text, fontSize: 15, flex: 1, marginLeft: 10 }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={64}
                />
                {password.length > 0 && (
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <Text className="text-textMuted text-[11px] mt-2 px-1" style={{ lineHeight: 16 }}>
                Ai join folder sẽ được xem và upload chung. Không đặt mật khẩu = ai biết mã cũng join được.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
