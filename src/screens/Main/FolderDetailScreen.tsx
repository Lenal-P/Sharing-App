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
import { useAuthStore } from '../../store/authStore';
import { FirestoreService } from '../../services/firestore.service';
import { useUploadMedia } from '../../hooks/useUploadMedia';
import { formatBytes } from '../../utils/formatters';
import { InviteMembersModal } from '../../components/InviteMembersModal';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'FolderDetail'>;
type RouteType = RouteProp<HomeStackParamList, 'FolderDetail'>;

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48 - 4) / 3;

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
  const { user } = useAuthStore();
  const { pickFromLibrary, pickFromCamera, uploadAssets, isUploading } = useUploadMedia();
  const [inviteOpen, setInviteOpen] = useState(false);

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
      { text: 'Huỷ', style: 'cancel' },
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

  // React Navigation cảnh báo non-serializable nếu param chứa Date. Convert sang ISO string.
  const serializableItems = mediaItems.map((m) => ({
    ...m,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  })) as unknown as MediaItem[];

  const renderItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <TouchableOpacity
      style={{ width: ITEM_SIZE, height: ITEM_SIZE, margin: 2 }}
      onPress={() => navigation.navigate('MediaViewer', { mediaItems: serializableItems, startIndex: index })}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.url }}
        style={{ width: '100%', height: '100%', borderRadius: 5 }}
        resizeMode="cover"
      />
      {item.type === 'video' && (
        <View className="absolute inset-0 items-center justify-center rounded-micro">
          <View className="bg-black/50 rounded-full p-2">
            <Ionicons name="play" size={16} color="#fff" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center px-6 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="chevron-back" size={26} color={COLORS.primaryDark} />
        </TouchableOpacity>
        <View
          style={{ backgroundColor: (folder.color || COLORS.primary) + '1A' }}
          className="w-9 h-9 rounded-micro items-center justify-center mr-3"
        >
          <Ionicons
            name={(folder.iconName as any) || 'folder'}
            size={18}
            color={folder.color || COLORS.primary}
          />
        </View>
        <View className="flex-1">
          <Text
            className="text-text font-semibold"
            style={{ fontSize: 17, letterSpacing: -0.374 }}
            numberOfLines={1}
          >
            {folder.name}
          </Text>
          <Text className="text-textMuted text-[12px] mt-0.5">
            {folder.mediaCount} file · {formatBytes(folder.totalSize)}
          </Text>
        </View>
        {user && folder.ownerId === user.uid && (
          <TouchableOpacity
            onPress={() => setInviteOpen(true)}
            className="w-9 h-9 rounded-full items-center justify-center mr-1.5 bg-surface"
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateFolder', { mode: 'edit', folderId: folder.id })}
          className="w-9 h-9 rounded-full items-center justify-center mr-1.5 bg-surface"
          activeOpacity={0.85}
        >
          <Ionicons name="pencil-outline" size={16} color={COLORS.textSecondary as string} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShare}
          className="w-9 h-9 rounded-full items-center justify-center mr-1.5 bg-surface"
          activeOpacity={0.85}
        >
          <Ionicons name="share-outline" size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleAddMedia}
          disabled={isUploading}
          className="w-9 h-9 rounded-full items-center justify-center bg-primary"
          activeOpacity={0.85}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="add" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {uploadProgress.length > 0 && (
        <View className="mx-6 mt-3 bg-surface rounded-lg px-4 py-3">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1">
              {activeUploads.length > 0 ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              )}
              <Text
                className="text-text font-semibold ml-2 text-[14px]"
                numberOfLines={1}
                style={{ letterSpacing: -0.224 }}
              >
                {activeUploads.length > 0
                  ? `Đang tải ${doneUploads + 1}/${uploadProgress.length}`
                  : errorUploads > 0
                  ? `Hoàn thành ${doneUploads}/${uploadProgress.length} · ${errorUploads} lỗi`
                  : `Hoàn thành ${doneUploads}/${uploadProgress.length}`}
              </Text>
            </View>
            <Text className="text-textMuted text-[12px] ml-2">{avgProgress}%</Text>
          </View>
          <View className="h-1 bg-border rounded-full overflow-hidden">
            <View
              style={{
                width: `${avgProgress}%`,
                backgroundColor: errorUploads > 0 && activeUploads.length === 0 ? COLORS.error : COLORS.primary,
              }}
              className="h-full rounded-full"
            />
          </View>
          {activeUploads[0] && (
            <Text className="text-textMuted text-[12px] mt-1.5" numberOfLines={1}>
              {activeUploads[0].status === 'compressing' ? 'Đang nén: ' : 'Đang tải: '}
              {activeUploads[0].fileName}
            </Text>
          )}
        </View>
      )}

      {folder.description ? (
        <View className="mx-6 mt-3 bg-surface rounded-lg px-4 py-3">
          <Text className="text-textSecondary text-[14px]" style={{ letterSpacing: -0.224 }}>
            {folder.description}
          </Text>
        </View>
      ) : null}

      {/* Member count chip */}
      {folder.members && folder.members.length > 0 && (
        <View className="mx-6 mt-3 flex-row items-center">
          <View className="bg-surface flex-row items-center px-3 py-1.5 rounded-pill">
            <Ionicons name="people" size={12} color={COLORS.primary} />
            <Text
              className="text-text font-semibold ml-1"
              style={{ fontSize: 12, letterSpacing: 0.3 }}
            >
              {folder.members.length} thành viên
            </Text>
          </View>
        </View>
      )}

      {folder.shareCode && (
        <View className="mx-6 mt-3 flex-row items-center">
          <View className="bg-surface flex-row items-center px-3 py-1.5 rounded-pill">
            <Ionicons name="key-outline" size={12} color={COLORS.primary} />
            <Text
              className="text-primary font-semibold ml-1"
              style={{ fontSize: 13, letterSpacing: 2 }}
            >
              {folder.shareCode}
            </Text>
          </View>
          <Text className="text-textMuted text-[12px] ml-2">Mã chia sẻ</Text>
        </View>
      )}

      {isLoadingMedia ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : mediaItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="bg-surface w-20 h-20 rounded-full items-center justify-center mb-4">
            <Ionicons name="images-outline" size={36} color={COLORS.textMuted as string} />
          </View>
          <Text
            className="text-text font-semibold mb-2"
            style={{ fontSize: 21, letterSpacing: -0.231 }}
          >
            Thư mục trống
          </Text>
          <Text
            className="text-textSecondary text-center mb-6"
            style={{ fontSize: 14, letterSpacing: -0.224 }}
          >
            Nhấn + để thêm ảnh hoặc video vào thư mục này.
          </Text>
          <TouchableOpacity
            onPress={handleAddMedia}
            className="bg-primary rounded-xs h-11 px-6 items-center justify-center"
            activeOpacity={0.85}
          >
            <Text className="text-white font-semibold text-[15px]">Thêm media</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={mediaItems}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 4, paddingTop: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingMedia}
              onRefresh={loadMedia}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {user && folder.ownerId === user.uid && (
        <InviteMembersModal
          visible={inviteOpen}
          existingMemberIds={folder.members ?? []}
          ownerId={folder.ownerId}
          currentUid={user.uid}
          onClose={() => setInviteOpen(false)}
          onInvite={async (uids) => {
            await FirestoreService.addMembers(folder.id, uids);
            updateFolder(folder.id, {
              members: [...(folder.members ?? []), ...uids],
            });
          }}
        />
      )}
    </SafeAreaView>
  );
};
