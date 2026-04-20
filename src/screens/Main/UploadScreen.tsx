import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { useUploadMedia } from '../../hooks/useUploadMedia';
import { useFolderStore } from '../../store/folderStore';
import { useAuthStore } from '../../store/authStore';
import { Folder, UploadProgress } from '../../config/types';
import { FirestoreService } from '../../services/firestore.service';
import { formatBytes } from '../../utils/formatters';

const StatusIcon = ({ status }: { status: UploadProgress['status'] }) => {
  if (status === 'done')
    return <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />;
  if (status === 'error')
    return <Ionicons name="close-circle" size={20} color={COLORS.error} />;
  return <ActivityIndicator size="small" color={COLORS.primary} />;
};

export const UploadScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { folders, setFolders, uploadProgress } = useFolderStore();
  const { pickFromLibrary, pickFromCamera, uploadAssets, isUploading } = useUploadMedia();

  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  useEffect(() => {
    // Nạp danh sách thư mục nếu store trống
    const load = async () => {
      if (!user || folders.length > 0) return;
      try {
        const list = await FirestoreService.getFoldersByUser(user.uid);
        setFolders(list);
      } catch (err) {
        console.error('Lỗi tải thư mục:', err);
      }
    };
    load();
  }, [user]);

  const handlePickLibrary = async () => {
    if (!selectedFolder) {
      Alert.alert('Chọn thư mục', 'Vui lòng chọn thư mục đích trước khi tải lên.');
      return;
    }
    const assets = await pickFromLibrary();
    if (assets) await uploadAssets(assets, selectedFolder.id);
  };

  const handlePickCamera = async () => {
    if (!selectedFolder) {
      Alert.alert('Chọn thư mục', 'Vui lòng chọn thư mục đích trước khi tải lên.');
      return;
    }
    const assets = await pickFromCamera();
    if (assets) await uploadAssets(assets, selectedFolder.id);
  };

  const goToCreateFolder = () => {
    navigation.navigate('Home', { screen: 'CreateFolder' });
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 py-4">
          <Text className="text-white text-2xl font-bold mb-1">Tải lên</Text>
          <Text className="text-textSecondary text-sm">
            Chọn thư mục đích, rồi tải ảnh/video lên
          </Text>
        </View>

        {/* Folder picker */}
        <View className="px-5 mb-4">
          <Text className="text-textSecondary text-sm mb-3 font-medium">THƯ MỤC ĐÍCH</Text>
          {folders.length === 0 ? (
            <TouchableOpacity
              onPress={goToCreateFolder}
              className="bg-card border border-dashed border-border rounded-2xl py-6 items-center"
            >
              <Ionicons name="folder-open-outline" size={32} color={COLORS.textMuted} />
              <Text className="text-white font-semibold mt-2">Chưa có thư mục</Text>
              <Text className="text-primary text-sm mt-1">Tạo thư mục đầu tiên</Text>
            </TouchableOpacity>
          ) : (
            <FlatList
              data={folders}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 12 }}
              renderItem={({ item }) => {
                const isSelected = selectedFolder?.id === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedFolder(item)}
                    style={{
                      borderColor: isSelected ? COLORS.primary : 'transparent',
                      borderWidth: 2,
                    }}
                    className={`${isSelected ? 'bg-primary/20' : 'bg-card'} mr-3 rounded-2xl p-3 w-32`}
                  >
                    <View className="bg-surfaceAlt w-10 h-10 rounded-full items-center justify-center mb-2">
                      <Ionicons
                        name="folder"
                        size={20}
                        color={isSelected ? COLORS.primary : COLORS.textSecondary}
                      />
                    </View>
                    <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-textMuted text-xs mt-0.5">
                      {item.mediaCount} file
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Action buttons */}
        {folders.length > 0 && (
          <View className="px-5 mb-5">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handlePickLibrary}
                disabled={isUploading || !selectedFolder}
                className={`flex-1 bg-primary rounded-2xl py-5 items-center ${
                  !selectedFolder || isUploading ? 'opacity-50' : ''
                }`}
              >
                <Ionicons name="images" size={28} color="#fff" />
                <Text className="text-white font-semibold mt-2">Thư viện</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePickCamera}
                disabled={isUploading || !selectedFolder}
                className={`flex-1 bg-secondary rounded-2xl py-5 items-center ${
                  !selectedFolder || isUploading ? 'opacity-50' : ''
                }`}
              >
                <Ionicons name="camera" size={28} color="#fff" />
                <Text className="text-white font-semibold mt-2">Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Progress */}
        {uploadProgress.length > 0 && (
          <View className="mx-5 bg-card rounded-2xl overflow-hidden mb-5">
            <View className="px-4 py-3 border-b border-border flex-row items-center">
              <Ionicons name="cloud-upload" size={18} color={COLORS.primary} />
              <Text className="text-white font-semibold ml-2">Tiến độ tải lên</Text>
            </View>
            {uploadProgress.map((item) => (
              <View
                key={item.fileName}
                className="flex-row items-center px-4 py-3 border-b border-border"
              >
                <View className="flex-1">
                  <Text className="text-white text-sm font-medium mb-1" numberOfLines={1}>
                    {item.fileName}
                  </Text>
                  <View className="h-1.5 bg-border rounded-full overflow-hidden">
                    <View
                      style={{
                        width: `${item.progress}%`,
                        backgroundColor:
                          item.status === 'error' ? COLORS.error : COLORS.primary,
                      }}
                      className="h-full rounded-full"
                    />
                  </View>
                  <Text className="text-textMuted text-xs mt-1">
                    {item.status === 'compressing'
                      ? 'Đang nén...'
                      : item.status === 'uploading'
                      ? `Đang tải... ${Math.round(item.progress)}%`
                      : item.status === 'done'
                      ? 'Hoàn thành'
                      : 'Lỗi'}
                  </Text>
                </View>
                <View className="ml-3">
                  <StatusIcon status={item.status} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Guide */}
        {uploadProgress.length === 0 && folders.length > 0 && (
          <View className="px-5 pb-10">
            <Text className="text-textSecondary text-sm mb-3 font-medium">HƯỚNG DẪN</Text>
            {[
              { icon: 'folder-open', text: 'Chọn thư mục đích ở trên' },
              { icon: 'images', text: 'Chọn từ thư viện hoặc quay/chụp mới' },
              { icon: 'rocket', text: 'File được nén tự động ở máy trước khi upload' },
              { icon: 'cloud-done', text: 'Ảnh/video sẽ xuất hiện trong thư mục' },
            ].map((step, i) => (
              <View key={i} className="flex-row items-center mb-3">
                <View className="bg-primary/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Ionicons name={step.icon as any} size={18} color={COLORS.primary} />
                </View>
                <Text className="text-textSecondary text-sm flex-1">{step.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
