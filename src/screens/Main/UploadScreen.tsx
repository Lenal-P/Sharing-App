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

const StatusIcon = ({ status }: { status: UploadProgress['status'] }) => {
  if (status === 'done') return <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />;
  if (status === 'error') return <Ionicons name="close-circle" size={20} color={COLORS.error} />;
  return <ActivityIndicator size="small" color={COLORS.primary} />;
};

export const UploadScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { folders, setFolders, uploadProgress } = useFolderStore();
  const { pickFromLibrary, pickFromCamera, uploadAssets, isUploading } = useUploadMedia();

  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  useEffect(() => {
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

  const requireFolder = () => {
    if (!selectedFolder) {
      Alert.alert('Chọn thư mục', 'Vui lòng chọn thư mục đích trước khi tải lên.');
      return false;
    }
    return true;
  };

  const handlePickLibrary = async () => {
    if (!requireFolder()) return;
    const assets = await pickFromLibrary();
    if (assets) await uploadAssets(assets, selectedFolder!.id);
  };

  const handlePickCamera = async () => {
    if (!requireFolder()) return;
    const assets = await pickFromCamera();
    if (assets) await uploadAssets(assets, selectedFolder!.id);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-6 pb-4">
          <Text
            className="text-textSecondary text-[12px] font-semibold mb-2"
            style={{ letterSpacing: 1, textTransform: 'uppercase' }}
          >
            Thêm nội dung
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
            Upload
          </Text>
          <Text
            className="text-textSecondary mt-2 text-[15px]"
            style={{ lineHeight: 22 }}
          >
            Chọn thư mục đích, rồi thêm ảnh/video.
          </Text>
        </View>

        {/* Folder picker */}
        <View className="px-6 mb-5">
          <Text
            className="text-textMuted text-[12px] font-medium mb-3"
            style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
          >
            Thư mục đích
          </Text>
          {folders.length === 0 ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('Home', { screen: 'CreateFolder' })}
              className="bg-surface rounded-lg py-6 items-center"
              activeOpacity={0.85}
            >
              <Ionicons name="folder-open-outline" size={28} color={COLORS.textMuted as string} />
              <Text className="text-text font-semibold mt-2 text-[15px]">Chưa có thư mục</Text>
              <Text className="text-primaryDark text-[13px] mt-1">Tạo thư mục đầu tiên</Text>
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
                const color = item.color || COLORS.primary;
                return (
                  <TouchableOpacity
                    onPress={() => setSelectedFolder(item)}
                    style={{
                      borderColor: isSelected ? COLORS.primary : 'rgba(0,0,0,0.06)',
                      borderWidth: isSelected ? 2 : 1,
                    }}
                    className={`${isSelected ? 'bg-primary/10' : 'bg-surface'} mr-3 rounded-lg p-3 w-32`}
                    activeOpacity={0.85}
                  >
                    <View
                      style={{ backgroundColor: color + '1A' }}
                      className="w-9 h-9 rounded-micro items-center justify-center mb-2"
                    >
                      <Ionicons
                        name={(item.iconName as any) || 'folder'}
                        size={18}
                        color={color}
                      />
                    </View>
                    <Text
                      className="text-text font-semibold text-[14px]"
                      numberOfLines={1}
                      style={{ letterSpacing: -0.224 }}
                    >
                      {item.name}
                    </Text>
                    <Text className="text-textMuted text-[12px] mt-0.5">{item.mediaCount} file</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Action buttons */}
        {folders.length > 0 && (
          <View className="px-6 mb-6">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handlePickLibrary}
                disabled={isUploading || !selectedFolder}
                className={`flex-1 bg-primary rounded-xs py-5 items-center ${
                  !selectedFolder || isUploading ? 'opacity-40' : ''
                }`}
                activeOpacity={0.85}
              >
                <Ionicons name="images-outline" size={26} color="#fff" />
                <Text className="text-white font-semibold mt-2 text-[15px]">Thư viện</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePickCamera}
                disabled={isUploading || !selectedFolder}
                className={`flex-1 bg-secondary rounded-xs py-5 items-center ${
                  !selectedFolder || isUploading ? 'opacity-40' : ''
                }`}
                activeOpacity={0.85}
              >
                <Ionicons name="camera-outline" size={26} color="#fff" />
                <Text className="text-white font-semibold mt-2 text-[15px]">Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Progress */}
        {uploadProgress.length > 0 && (
          <View className="mx-6 bg-surface rounded-lg overflow-hidden mb-6">
            <View className="px-4 py-3 border-b border-border flex-row items-center">
              <Ionicons name="cloud-upload-outline" size={18} color={COLORS.primary} />
              <Text className="text-text font-semibold ml-2 text-[15px]">Tiến độ tải lên</Text>
            </View>
            {uploadProgress.map((item) => (
              <View
                key={item.fileName}
                className="flex-row items-center px-4 py-3 border-b border-border"
              >
                <View className="flex-1">
                  <Text
                    className="text-text text-[14px] font-medium mb-1"
                    numberOfLines={1}
                  >
                    {item.fileName}
                  </Text>
                  <View className="h-1 bg-border rounded-full overflow-hidden">
                    <View
                      style={{
                        width: `${item.progress}%`,
                        backgroundColor: item.status === 'error' ? COLORS.error : COLORS.primary,
                      }}
                      className="h-full rounded-full"
                    />
                  </View>
                  <Text className="text-textMuted text-[12px] mt-1">
                    {item.status === 'compressing' ? 'Đang nén...' :
                     item.status === 'uploading' ? `Đang tải... ${Math.round(item.progress)}%` :
                     item.status === 'done' ? 'Hoàn thành' : 'Lỗi'}
                  </Text>
                </View>
                <View className="ml-3">
                  <StatusIcon status={item.status} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Hướng dẫn */}
        {uploadProgress.length === 0 && folders.length > 0 && (
          <View className="px-6 pb-10">
            <Text
              className="text-textMuted text-[12px] font-medium mb-3"
              style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
            >
              Hướng dẫn
            </Text>
            {[
              { icon: 'folder-open-outline', text: 'Chọn thư mục đích ở trên' },
              { icon: 'images-outline', text: 'Chọn từ thư viện hoặc quay/chụp mới' },
              { icon: 'flash-outline', text: 'File được nén tự động ở máy trước khi upload' },
              { icon: 'cloud-done-outline', text: 'Ảnh/video sẽ xuất hiện trong thư mục' },
            ].map((step, i) => (
              <View key={i} className="flex-row items-center mb-4">
                <View className="bg-surface w-10 h-10 rounded-micro items-center justify-center mr-3">
                  <Ionicons name={step.icon as any} size={18} color={COLORS.primary} />
                </View>
                <Text className="text-textSecondary text-[15px] flex-1">{step.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
