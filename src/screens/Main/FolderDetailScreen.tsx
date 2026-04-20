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
import { useEffect, useCallback, useState } from 'react';
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
  const { folder: initialFolder } = route.params;

  const [folder, setFolder] = useState<Folder>(initialFolder);
  const { mediaItems, setMediaItems, isLoadingMedia, setLoadingMedia, updateFolder } = useFolderStore();
  const { pickFromLibrary, pickFromCamera, uploadAssets, isUploading } = useUploadMedia();

  const loadMedia = useCallback(async () => {
    try {
      setLoadingMedia(true);
      const items = await FirestoreService.getMediaItemsByFolder(folder.id);
      setMediaItems(items);
    } catch (error) {
      console.error('Lỗi tải media:', error);
    } finally {
      setLoadingMedia(false);
    }
  }, [folder.id]);

  useEffect(() => {
    loadMedia();
    return () => setMediaItems([]);
  }, []);

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
        const updated: Folder = { ...folder, isPublic, shareCode };
        setFolder(updated);
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
        <View className="flex-1">
          <Text className="text-white text-xl font-bold" numberOfLines={1}>
            {folder.name}
          </Text>
          <Text className="text-textSecondary text-xs mt-0.5">
            {folder.mediaCount} file · {formatBytes(folder.totalSize)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleShare}
          className="bg-surfaceAlt p-2.5 rounded-full mr-2"
        >
          <Ionicons name="share-social" size={20} color={COLORS.primary} />
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
