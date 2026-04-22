import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SharedStackParamList, Folder, MediaItem } from '../../config/types';
import { COLORS } from '../../config/constants';
import { FirestoreService } from '../../services/firestore.service';
import { formatBytes } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import { useUploadMedia } from '../../hooks/useUploadMedia';
import { PressableScale } from '../../components/PressableScale';

type Nav = NativeStackNavigationProp<SharedStackParamList, 'SharedFolder'>;
type RouteType = RouteProp<SharedStackParamList, 'SharedFolder'>;

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48 - 4) / 3;

export const SharedFolderViewerScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { folderId, shareCode } = route.params;

  const { user } = useAuthStore();
  const { pickFromLibrary, pickFromCamera, uploadAssets, isUploading } = useUploadMedia();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const f = folderId
        ? await FirestoreService.getFolderById(folderId)
        : await FirestoreService.getFolderByShareCode(shareCode);
      if (!f) {
        setFolder(null);
        setLoading(false);
        return;
      }
      setFolder(f);
      const list = await FirestoreService.getMediaItemsByFolder(f.id);
      setItems(list);
    } catch (err) {
      console.error('Không tải được folder chia sẻ:', err);
    } finally {
      setLoading(false);
    }
  }, [folderId, shareCode]);

  useEffect(() => {
    reload();
  }, [reload]);

  const canUpload = !!user && !!folder && (folder.ownerId === user.uid || folder.members?.includes(user.uid));

  const handleAddMedia = () => {
    if (!folder) return;
    Alert.alert('Thêm media', 'Chọn nguồn ảnh/video', [
      {
        text: 'Thư viện',
        onPress: async () => {
          const assets = await pickFromLibrary();
          if (assets) {
            await uploadAssets(assets, folder.id);
            reload();
          }
        },
      },
      {
        text: 'Camera',
        onPress: async () => {
          const assets = await pickFromCamera();
          if (assets) {
            await uploadAssets(assets, folder.id);
            reload();
          }
        },
      },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  const serializableItems = items.map((m) => ({
    ...m,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  })) as unknown as MediaItem[];

  const renderItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <TouchableOpacity
      style={{ width: ITEM_SIZE, height: ITEM_SIZE, margin: 2 }}
      onPress={() =>
        navigation.navigate('SharedMediaViewer', { mediaItems: serializableItems, startIndex: index })
      }
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.url }}
        style={{ width: '100%', height: '100%', borderRadius: 5 }}
        resizeMode="cover"
      />
      {item.type === 'video' && (
        <View className="absolute inset-0 items-center justify-center">
          <View className="bg-black/50 rounded-full p-2">
            <Ionicons name="play" size={16} color="#fff" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="small" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!folder) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-10">
        <Ionicons name="alert-circle-outline" size={44} color={COLORS.textMuted} />
        <Text
          className="text-text mt-3 mb-1"
          style={{ fontSize: 21, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.3 }}
        >
          Không tìm thấy
        </Text>
        <Text className="text-textSecondary text-center text-[14px]">
          Thư mục không tồn tại hoặc đã bị xoá.
        </Text>
        <PressableScale
          onPress={() => navigation.goBack()}
          scaleTo={0.96}
          style={{
            marginTop: 24,
            backgroundColor: COLORS.primary,
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 30,
          }}
        >
          <Text
            className="text-white font-semibold text-[14px]"
            style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
          >
            Quay lại
          </Text>
        </PressableScale>
      </SafeAreaView>
    );
  }

  const color = folder.color || COLORS.primary;
  const iconName = (folder.iconName as any) || 'folder';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center px-6 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="chevron-back" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <View
          style={{ backgroundColor: color }}
          className="w-9 h-9 rounded-full items-center justify-center mr-3"
        >
          <Ionicons name={iconName} size={18} color="#fff" />
        </View>
        <View className="flex-1">
          <Text
            className="text-text font-semibold"
            style={{ fontSize: 16, letterSpacing: -0.3 }}
            numberOfLines={1}
          >
            {folder.name}
          </Text>
          <Text className="text-textSecondary text-[12px] mt-0.5" numberOfLines={1}>
            {folder.ownerDisplayName ? `@${folder.ownerDisplayName} · ` : ''}
            {folder.mediaCount} mục · {formatBytes(folder.totalSize)}
          </Text>
        </View>
        {canUpload && (
          <PressableScale
            onPress={handleAddMedia}
            haptic
            disabled={isUploading}
            style={{
              backgroundColor: COLORS.primary,
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="add" size={20} color="#fff" />
            )}
          </PressableScale>
        )}
      </View>

      {folder.description ? (
        <View className="mx-6 mt-3 bg-surface rounded-lg px-4 py-3">
          <Text className="text-textSecondary text-[14px]" style={{ lineHeight: 20 }}>
            {folder.description}
          </Text>
        </View>
      ) : null}

      <View className="mx-6 mt-3 flex-row items-center">
        <View className="bg-primary/10 flex-row items-center px-3 py-1.5 rounded-pill mr-2">
          <Ionicons
            name={folder.isPublic ? 'globe-outline' : 'lock-closed-outline'}
            size={12}
            color={COLORS.primary}
          />
          <Text
            className="text-primary text-[11px] font-bold ml-1"
            style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}
          >
            {folder.isPublic ? 'Public' : 'Private'}
          </Text>
        </View>
        {canUpload && (
          <View className="bg-success/10 flex-row items-center px-3 py-1.5 rounded-pill">
            <Ionicons name="people-outline" size={12} color={COLORS.success} />
            <Text
              className="text-success text-[11px] font-bold ml-1"
              style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}
            >
              Thành viên
            </Text>
          </View>
        )}
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="images-outline" size={40} color={COLORS.textMuted} />
          <Text className="text-textSecondary text-[14px] mt-3 text-center">
            {canUpload
              ? 'Thư mục trống — bạn có thể upload ảnh/video'
              : 'Thư mục này chưa có file nào'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 4, paddingTop: 10 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={reload} tintColor={COLORS.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
};
