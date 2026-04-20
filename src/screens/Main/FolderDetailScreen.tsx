import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList, Folder, MediaItem } from '../../config/types';
import { COLORS } from '../../config/constants';
import { useFolderStore } from '../../store/folderStore';
import { FirestoreService } from '../../services/firestore.service';
import { useUploadMedia } from '../../hooks/useUploadMedia';
import { formatBytes } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'FolderDetail'>;
type RouteType = RouteProp<HomeStackParamList, 'FolderDetail'>;

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 40 - 8) / 3;

export const FolderDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { folderId } = route.params;

  const folder = useFolderStore((s) => s.folders.find((f) => f.id === folderId)) as Folder | undefined;
  const {
    mediaItems,
    setMediaItems,
    isLoadingMedia,
    setLoadingMedia,
    updateFolder,
    uploadProgress,
  } = useFolderStore();
  const { pickFromLibrary, pickFromCamera, uploadAssets, isUploading } = useUploadMedia();

  const activeUploads = uploadProgress.filter(
    (p) => p.status === 'compressing' || p.status === 'uploading'
  );
  const doneUploads = uploadProgress.filter((p) => p.status === 'done').length;
  const errorUploads = uploadProgress.filter((p) => p.status === 'error').length;
  const avgProgress = uploadProgress.length
    ? Math.round(
        uploadProgress.reduce((sum, p) => sum + (p.status === 'done' ? 100 : p.progress), 0) /
          uploadProgress.length
      )
    : 0;

  const loadMedia = useCallback(async () => {
    if (!folder) return;
    try {
      setLoadingMedia(true);
      const items = await FirestoreService.getMediaItemsByFolder(folder.id);
      setMediaItems(items);
    } catch (error) {
      console.error('Lỗi tải media:', error);
    } finally {
      setLoadingMedia(false);
    }
  }, [folder?.id]);

  useEffect(() => {
    loadMedia();
    return () => setMediaItems([]);
  }, []);

  // Nếu folder bị xoá khỏi store (ví dụ xoá từ tab khác), quay về.
  useEffect(() => {
    if (!folder) navigation.goBack();
  }, [folder, navigation]);

  if (!folder) return null;

  const handleAddMedia = () => {
    Alert.alert('Thêm media', 'Chọn nguồn ảnh/video', [
      {
        text: 'Thư viện',
        onPress: async () => {
          const assets = await pickFromLibrary();
          if (assets) await uploadAssets(assets, folder.id);
        },
      },
      {
        text: 'Camera',
        onPress: async () => {
          const assets = await pickFromCamera();
          if (assets) await uploadAssets(assets, folder.id);
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const handleShare = async () => {
    try {
      let { isPublic, shareCode } = folder;
      if (!isPublic || !shareCode) {
        const result = await FirestoreService.toggleFolderShare(folder.id, true);
        isPublic = result.isPublic;
        shareCode = result.shareCode;
        updateFolder(folder.id, { isPublic, shareCode });
      }
      await Share.share({
        message: `Xem thư mục "${folder.name}" trên Sharing bằng mã: ${shareCode}`,
      });
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể chia sẻ thư mục');
    }
  };

  const renderItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <TouchableOpacity
      style={{ width: ITEM_SIZE, height: ITEM_SIZE, margin: 2 }}
      onPress={() =>
        navigation.navigate('MediaViewer', { mediaItems, startIndex: index })
      }
    >
      <Image
        source={{ uri: item.url }}
        style={{ width: '100%', height: '100%', borderRadius: 8 }}
        resizeMode="cover"
      />
      {item.type === 'video' && (
        <View className="absolute inset-0 items-center justify-center rounded-lg">
          <View className="bg-black/50 rounded-full p-2">
            <Ionicons name="play" size={16} color="#fff" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View
          style={{ backgroundColor: (folder.color || COLORS.primary) + '33' }}
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
        >
          <Ionicons
            name={(folder.iconName as any) || 'folder'}
            size={18}
            color={folder.color || COLORS.primary}
          />
        </View>
        <View className="flex-1">
          <Text className="text-white text-lg font-bold" numberOfLines={1}>
            {folder.name}
          </Text>
          <Text className="text-textSecondary text-xs mt-0.5">
            {folder.mediaCount} file · {formatBytes(folder.totalSize)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateFolder', { mode: 'edit', folderId: folder.id })}
          className="bg-surfaceAlt p-2.5 rounded-full mr-2"
        >
          <Ionicons name="create-outline" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShare}
          className="bg-surfaceAlt p-2.5 rounded-full mr-2"
        >
          <Ionicons name="share-social" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAddMedia}
          disabled={isUploading}
          className="bg-primary p-2.5 rounded-full"
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="add" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Upload progress banner */}
      {uploadProgress.length > 0 && (
        <View className="mx-5 mb-3 bg-card rounded-xl px-4 py-3">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1">
              {activeUploads.length > 0 ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              )}
              <Text className="text-white text-sm font-semibold ml-2" numberOfLines={1}>
                {activeUploads.length > 0
                  ? `Đang tải ${doneUploads + 1}/${uploadProgress.length}`
                  : errorUploads > 0
                  ? `Hoàn thành ${doneUploads}/${uploadProgress.length} · ${errorUploads} lỗi`
                  : `Hoàn thành ${doneUploads}/${uploadProgress.length}`}
              </Text>
            </View>
            <Text className="text-textSecondary text-xs ml-2">{avgProgress}%</Text>
          </View>
          <View className="h-1.5 bg-border rounded-full overflow-hidden">
            <View
              style={{
                width: `${avgProgress}%`,
                backgroundColor: errorUploads > 0 && activeUploads.length === 0 ? COLORS.error : COLORS.primary,
              }}
              className="h-full rounded-full"
            />
          </View>
          {activeUploads[0] && (
            <Text className="text-textMuted text-xs mt-1.5" numberOfLines={1}>
              {activeUploads[0].status === 'compressing' ? 'Đang nén: ' : 'Đang tải: '}
              {activeUploads[0].fileName}
            </Text>
          )}
        </View>
      )}

      {/* Info Bar */}
      {folder.description ? (
        <View className="mx-5 mb-3 bg-card rounded-xl px-4 py-3">
          <Text className="text-textSecondary text-sm">{folder.description}</Text>
        </View>
      ) : null}

      {/* Share Code chip */}
      {folder.shareCode && (
        <View className="mx-5 mb-3 flex-row items-center">
          <View className="bg-surfaceAlt flex-row items-center px-3 py-2 rounded-lg">
            <Ionicons name="key-outline" size={14} color={COLORS.primary} />
            <Text className="text-primary text-sm font-bold ml-1 tracking-widest">
              {folder.shareCode}
            </Text>
          </View>
          <Text className="text-textMuted text-xs ml-2">Mã chia sẻ</Text>
        </View>
      )}

      {/* Media Grid */}
      {isLoadingMedia ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : mediaItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="bg-surfaceAlt w-24 h-24 rounded-full items-center justify-center mb-4">
            <Ionicons name="images-outline" size={44} color={COLORS.textMuted} />
          </View>
          <Text className="text-white text-lg font-bold mb-2">Thư mục trống</Text>
          <Text className="text-textSecondary text-sm text-center">
            Nhấn nút + để thêm ảnh hoặc video vào thư mục này
          </Text>
          <TouchableOpacity
            onPress={handleAddMedia}
            className="bg-primary mt-6 px-8 py-3 rounded-xl"
          >
            <Text className="text-white font-bold">Thêm media</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={mediaItems}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 4 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingMedia}
              onRefresh={loadMedia}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};
