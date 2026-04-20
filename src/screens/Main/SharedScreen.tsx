import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/constants';
import { FirestoreService } from '../../services/firestore.service';
import { Folder, SharedStackParamList } from '../../config/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<SharedStackParamList, 'SharedHome'>;

export const SharedScreen = () => {
  const navigation = useNavigation<Nav>();
  const [shareCode, setShareCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foundFolder, setFoundFolder] = useState<Folder | null>(null);

  const handleSearch = async () => {
    if (!shareCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã chia sẻ');
      return;
    }
    try {
      setIsLoading(true);
      setFoundFolder(null);
      const folder = await FirestoreService.getFolderByShareCode(shareCode.trim().toUpperCase());
      if (folder) {
        setFoundFolder(folder);
      } else {
        Alert.alert('Không tìm thấy', 'Mã chia sẻ không hợp lệ hoặc đã hết hạn.');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tìm kiếm. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-5 py-4">
        <Text className="text-white text-2xl font-bold mb-1">Nhận chia sẻ</Text>
        <Text className="text-textSecondary text-sm">
          Nhập mã chia sẻ để truy cập thư mục của người khác
        </Text>
      </View>

      {/* Ô nhập mã */}
      <View className="px-5 mb-6">
        <View className="bg-card rounded-2xl border border-border flex-row items-center px-4 py-2">
          <Ionicons name="key-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            value={shareCode}
            onChangeText={(t) => setShareCode(t.toUpperCase())}
            placeholder="Ví dụ: ABC123"
            placeholderTextColor={COLORS.textMuted}
            style={{ color: COLORS.text, fontSize: 18, fontWeight: 'bold', flex: 1, marginHorizontal: 10, letterSpacing: 4 }}
            autoCapitalize="characters"
            maxLength={8}
          />
          <TouchableOpacity
            onPress={handleSearch}
            disabled={isLoading}
            className="bg-primary rounded-xl px-4 py-2"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Kết quả tìm kiếm */}
      {foundFolder ? (
        <View className="mx-5 bg-card rounded-2xl p-5">
          <View className="flex-row items-center mb-4">
            <View className="bg-primary w-14 h-14 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="folder" size={28} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg" numberOfLines={1}>
                {foundFolder.name}
              </Text>
              {foundFolder.description ? (
                <Text className="text-textSecondary text-sm mt-1" numberOfLines={2}>
                  {foundFolder.description}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="flex-row mb-4">
            <View className="flex-row items-center mr-5">
              <Ionicons name="images-outline" size={16} color={COLORS.textMuted} />
              <Text className="text-textSecondary text-sm ml-1">
                {foundFolder.mediaCount} file
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="earth-outline" size={16} color={COLORS.accent} />
              <Text className="text-accent text-sm ml-1">Công khai</Text>
            </View>
          </View>

          <TouchableOpacity
            className="bg-primary py-3 rounded-xl items-center"
            onPress={() =>
              navigation.navigate('SharedFolder', {
                folderId: foundFolder.id,
                shareCode: foundFolder.shareCode ?? shareCode.trim().toUpperCase(),
              })
            }
          >
            <Text className="text-white font-bold">Xem thư mục</Text>
          </TouchableOpacity>
        </View>
      ) : !isLoading ? (
        /* Empty state */
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-surfaceAlt w-28 h-28 rounded-full items-center justify-center mb-6">
            <Ionicons name="share-social-outline" size={56} color={COLORS.primary} />
          </View>
          <Text className="text-white text-xl font-bold mb-2 text-center">
            Nhận thư mục chia sẻ
          </Text>
          <Text className="text-textSecondary text-sm text-center leading-6">
            Người khác có thể chia sẻ thư mục với bạn qua một mã ngắn.{'\n'}
            Nhập mã ở trên để xem nội dung.
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
};
