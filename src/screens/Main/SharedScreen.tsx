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
      Alert.alert('Thiếu mã', 'Vui lòng nhập mã chia sẻ');
      return;
    }
    try {
      setIsLoading(true);
      setFoundFolder(null);
      const folder = await FirestoreService.getFolderByShareCode(shareCode.trim().toUpperCase());
      if (folder) setFoundFolder(folder);
      else Alert.alert('Không tìm thấy', 'Mã chia sẻ không hợp lệ hoặc đã hết hạn.');
    } catch {
      Alert.alert('Lỗi', 'Không thể tìm kiếm. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-6 pt-6 pb-5">
        <Text
          className="text-textSecondary text-[12px] font-semibold mb-2"
          style={{ letterSpacing: 1, textTransform: 'uppercase' }}
        >
          Khám phá
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
          Share
        </Text>
        <Text className="text-textSecondary mt-2 text-[15px]" style={{ lineHeight: 22 }}>
          Nhập mã chia sẻ để truy cập thư mục.
        </Text>
      </View>

      <View className="px-6 mb-5">
        <View className="bg-surface rounded-md flex-row items-center px-4 h-12">
          <Ionicons name="key-outline" size={18} color={COLORS.textMuted as string} />
          <TextInput
            value={shareCode}
            onChangeText={(t) => setShareCode(t.toUpperCase())}
            placeholder="Ví dụ: ABC123"
            placeholderTextColor={COLORS.textMuted as string}
            style={{
              color: COLORS.text,
              fontSize: 17,
              fontWeight: '600',
              flex: 1,
              marginHorizontal: 10,
              letterSpacing: 3,
            }}
            autoCapitalize="characters"
            maxLength={8}
          />
          <TouchableOpacity
            onPress={handleSearch}
            disabled={isLoading}
            className="bg-primary rounded-xs px-3 h-8 items-center justify-center"
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-[13px] font-semibold">Tìm</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {foundFolder ? (
        <View className="mx-6 bg-surface rounded-lg p-5">
          <View className="flex-row items-center mb-4">
            <View
              style={{ backgroundColor: (foundFolder.color || COLORS.primary) + '1A' }}
              className="w-14 h-14 rounded-md items-center justify-center mr-4"
            >
              <Ionicons
                name={(foundFolder.iconName as any) || 'folder'}
                size={26}
                color={foundFolder.color || COLORS.primary}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-text font-semibold text-[17px]"
                numberOfLines={1}
                style={{ letterSpacing: -0.374 }}
              >
                {foundFolder.name}
              </Text>
              {foundFolder.description ? (
                <Text
                  className="text-textSecondary text-[13px] mt-1"
                  numberOfLines={2}
                  style={{ letterSpacing: -0.224 }}
                >
                  {foundFolder.description}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="flex-row mb-5">
            <View className="flex-row items-center mr-5">
              <Ionicons name="images-outline" size={15} color={COLORS.textMuted as string} />
              <Text className="text-textSecondary text-[13px] ml-1">{foundFolder.mediaCount} file</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="link" size={14} color={COLORS.primaryDark} />
              <Text className="text-primaryDark text-[13px] ml-1 font-medium">Công khai</Text>
            </View>
          </View>

          <TouchableOpacity
            className="bg-primary h-11 rounded-xs items-center justify-center"
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('SharedFolder', {
                folderId: foundFolder.id,
                shareCode: foundFolder.shareCode ?? shareCode.trim().toUpperCase(),
              })
            }
          >
            <Text className="text-white font-semibold text-[15px]">Xem thư mục</Text>
          </TouchableOpacity>
        </View>
      ) : !isLoading ? (
        <View className="flex-1 items-center justify-center px-10 pb-20">
          <View className="bg-surface w-20 h-20 rounded-full items-center justify-center mb-4">
            <Ionicons name="share-social-outline" size={36} color={COLORS.textMuted as string} />
          </View>
          <Text
            className="text-text font-semibold mb-2 text-center"
            style={{ fontSize: 21, letterSpacing: -0.231 }}
          >
            Nhận thư mục chia sẻ
          </Text>
          <Text
            className="text-textSecondary text-center"
            style={{ fontSize: 14, lineHeight: 20, letterSpacing: -0.224 }}
          >
            Người khác có thể chia sẻ thư mục với bạn qua mã ngắn.{'\n'}Nhập mã ở trên để xem.
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
};
