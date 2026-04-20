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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../config/types';
import { COLORS } from '../../config/constants';
import { useAuthStore } from '../../store/authStore';
import { useFolderStore } from '../../store/folderStore';
import { FirestoreService } from '../../services/firestore.service';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'CreateFolder'>;

const FOLDER_ICONS = ['folder', 'images', 'videocam', 'document-text', 'star', 'heart', 'briefcase', 'school'] as const;
const FOLDER_COLORS = ['#6C63FF', '#FF6584', '#43E97B', '#FFB347', '#36D1DC', '#F953C6', '#B91D73', '#4facfe'];

export const CreateFolderScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const { addFolder } = useFolderStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string>('folder');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên thư mục');
      return;
    }
    if (!user) return;

    try {
      setIsLoading(true);
      const newFolder = await FirestoreService.createFolder({
        ownerId: user.uid,
        name: name.trim(),
        description: description.trim() || undefined,
        mediaCount: 0,
        totalSize: 0,
        isPublic,
        sharedWith: [],
      });
      addFolder(newFolder);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tạo thư mục. Vui lòng thử lại.');
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
        {/* Header */}
        <View className="flex-row items-center px-5 py-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1">Tạo thư mục mới</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={isLoading}
            className="bg-primary px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-bold">
              {isLoading ? 'Đang tạo...' : 'Tạo'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-5">
          {/* Preview */}
          <View className="items-center mb-8 mt-4">
            <View
              style={{ backgroundColor: selectedColor + '33', borderColor: selectedColor }}
              className="w-28 h-28 rounded-3xl items-center justify-center border-2 mb-3"
            >
              <Ionicons name={selectedIcon as any} size={52} color={selectedColor} />
            </View>
            <Text className="text-white font-semibold text-lg">
              {name || 'Tên thư mục'}
            </Text>
          </View>

          {/* Chọn icon */}
          <Text className="text-textSecondary text-sm mb-3 font-medium">BIỂU TƯỢNG</Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
            {FOLDER_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                onPress={() => setSelectedIcon(icon)}
                style={{
                  backgroundColor: selectedIcon === icon ? selectedColor + '33' : COLORS.card,
                  borderColor: selectedIcon === icon ? selectedColor : 'transparent',
                  borderWidth: 2,
                }}
                className="w-14 h-14 rounded-2xl items-center justify-center"
              >
                <Ionicons
                  name={icon as any}
                  size={26}
                  color={selectedIcon === icon ? selectedColor : COLORS.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Chọn màu */}
          <Text className="text-textSecondary text-sm mb-3 font-medium">MÀU SẮC</Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
            {FOLDER_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                style={{ backgroundColor: color }}
                className="w-10 h-10 rounded-full items-center justify-center"
              >
                {selectedColor === color && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Tên thư mục */}
          <Text className="text-textSecondary text-sm mb-2 font-medium">TÊN THƯ MỤC *</Text>
          <View className="bg-card rounded-2xl px-4 py-3 mb-5 border border-border">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nhập tên thư mục..."
              placeholderTextColor={COLORS.textMuted}
              style={{ color: COLORS.text, fontSize: 15 }}
              maxLength={50}
            />
          </View>

          {/* Mô tả */}
          <Text className="text-textSecondary text-sm mb-2 font-medium">MÔ TẢ (tuỳ chọn)</Text>
          <View className="bg-card rounded-2xl px-4 py-3 mb-5 border border-border">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả ngắn về thư mục..."
              placeholderTextColor={COLORS.textMuted}
              style={{ color: COLORS.text, fontSize: 15 }}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          {/* Công khai */}
          <View className="bg-card rounded-2xl px-4 py-4 flex-row items-center justify-between mb-8">
            <View className="flex-row items-center flex-1">
              <View className="bg-surfaceAlt w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons
                  name={isPublic ? 'earth' : 'lock-closed'}
                  size={20}
                  color={isPublic ? COLORS.accent : COLORS.textMuted}
                />
              </View>
              <View>
                <Text className="text-white font-medium">
                  {isPublic ? 'Công khai' : 'Riêng tư'}
                </Text>
                <Text className="text-textMuted text-xs mt-0.5">
                  {isPublic
                    ? 'Ai có link đều có thể xem'
                    : 'Chỉ bạn và người được chia sẻ'}
                </Text>
              </View>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
              thumbColor={isPublic ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
