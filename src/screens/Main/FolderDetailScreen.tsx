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
import { useEffect, useCallback, useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList, Folder, MediaItem, MediaType } from '../../config/types';
import { COLORS } from '../../config/constants';
import { useFolderStore } from '../../store/folderStore';
import { useAuthStore } from '../../store/authStore';
import { FirestoreService } from '../../services/firestore.service';
import { useUploadMedia } from '../../hooks/useUploadMedia';
import { formatBytes } from '../../utils/formatters';
import { downloadToGallery } from '../../utils/downloadMedia';
import { InviteMembersModal } from '../../components/InviteMembersModal';
import { MembersModal } from '../../components/MembersModal';
import { SearchBar } from '../../components/SearchBar';
import { FilterChips } from '../../components/FilterChips';
import { SortSheet, SortOption } from '../../components/SortSheet';
import { PressableScale } from '../../components/PressableScale';
import * as Haptics from 'expo-haptics';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'FolderDetail'>;
type RouteType = RouteProp<HomeStackParamList, 'FolderDetail'>;

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48 - 4) / 3;

type TypeFilter = 'all' | MediaType;
type SortKey = 'newest' | 'oldest' | 'name' | 'size';

const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: 'newest', label: 'Mới nhất', icon: 'time-outline' },
  { key: 'oldest', label: 'Cũ nhất', icon: 'hourglass-outline' },
  { key: 'name', label: 'Tên (A → Z)', icon: 'text-outline' },
  { key: 'size', label: 'Kích thước (lớn → nhỏ)', icon: 'server-outline' },
];

export const FolderDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { folderId } = route.params;

  const folder = useFolderStore((s) => s.folders.find((f) => f.id === folderId)) as Folder | undefined;
  const {
    mediaItems,
    setMediaItems,
    removeMediaItem,
    isLoadingMedia,
    setLoadingMedia,
    updateFolder,
    uploadProgress,
  } = useFolderStore();
  const { user } = useAuthStore();
  const { pickFromLibrary, pickFromCamera, uploadAssets, isUploading, retryAllFailed, dismissUploadProgress } = useUploadMedia();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  // Filter + sort + search state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);

  // Bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

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

  const filteredItems = useMemo(() => {
    let list = mediaItems;
    if (typeFilter !== 'all') list = list.filter((m) => m.type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.fileName.toLowerCase().includes(q) ||
          m.caption?.toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    switch (sortKey) {
      case 'newest':
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'name':
        sorted.sort((a, b) => a.fileName.localeCompare(b.fileName, 'vi'));
        break;
      case 'size':
        sorted.sort((a, b) => b.fileSize - a.fileSize);
        break;
    }
    return sorted;
  }, [mediaItems, typeFilter, search, sortKey]);

  const imageCount = useMemo(() => mediaItems.filter((m) => m.type === 'image').length, [mediaItems]);
  const videoCount = mediaItems.length - imageCount;

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

  // ===== SELECT MODE =====
  const enterSelect = (firstItemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSelectMode(true);
    setSelected(new Set([firstItemId]));
  };
  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    if (next.size === 0) setSelectMode(false);
  };

  const selectedItems = useMemo(
    () => mediaItems.filter((m) => selected.has(m.id)),
    [mediaItems, selected]
  );

  const bulkDownload = async () => {
    setBulkLoading(true);
    let done = 0;
    let failed = 0;
    for (const item of selectedItems) {
      try {
        await downloadToGallery(item.url, item.fileName);
        done += 1;
      } catch (e) {
        failed += 1;
        console.warn('Bulk download item thất bại:', item.fileName, e);
      }
    }
    setBulkLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert(
      'Tải về xong',
      `${done} file đã lưu vào album "Sharing"${failed ? ` · ${failed} lỗi` : ''}.`
    );
    exitSelect();
  };

  const bulkDelete = () => {
    Alert.alert(
      'Xoá các file đã chọn?',
      `${selectedItems.length} file sẽ bị xoá vĩnh viễn.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setBulkLoading(true);
            for (const item of selectedItems) {
              try {
                await FirestoreService.deleteMediaItem(item, user.uid);
                removeMediaItem(item.id);
              } catch (e) {
                console.warn('Bulk delete item lỗi:', item.id, e);
              }
            }
            setBulkLoading(false);
            exitSelect();
          },
        },
      ]
    );
  };

  const bulkShare = async () => {
    try {
      const urls = selectedItems.map((m) => m.url).join('\n');
      await Share.share({
        message: `${selectedItems.length} media từ "${folder.name}":\n${urls}`,
      });
    } catch (e) {
      console.warn('Bulk share huỷ:', e);
    }
  };

  const serializableItems = filteredItems.map((m) => ({
    ...m,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  })) as unknown as MediaItem[];

  const renderItem = ({ item, index }: { item: MediaItem; index: number }) => {
    const picked = selected.has(item.id);
    return (
      <TouchableOpacity
        style={{ width: ITEM_SIZE, height: ITEM_SIZE, margin: 2 }}
        onPress={() => {
          if (selectMode) {
            toggleSelect(item.id);
          } else {
            navigation.navigate('MediaViewer', {
              mediaItems: serializableItems,
              startIndex: index,
            });
          }
        }}
        onLongPress={() => {
          if (!selectMode) enterSelect(item.id);
        }}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: item.url }}
          style={{ width: '100%', height: '100%', borderRadius: 5 }}
          resizeMode="cover"
        />
        {item.type === 'video' && !selectMode && (
          <View className="absolute inset-0 items-center justify-center">
            <View className="bg-black/50 rounded-full p-2">
              <Ionicons name="play" size={16} color="#fff" />
            </View>
          </View>
        )}
        {selectMode && (
          <View
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: picked ? 'rgba(17,17,17,0.35)' : 'transparent',
              borderRadius: 5,
              borderWidth: picked ? 3 : 0,
              borderColor: COLORS.primary,
            }}
          />
        )}
        {selectMode && (
          <View
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 2,
              borderColor: picked ? COLORS.primary : '#fff',
              backgroundColor: picked ? COLORS.primary : 'rgba(0,0,0,0.4)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {picked && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header — đổi hoàn toàn trong select mode */}
      {selectMode ? (
        <View className="flex-row items-center px-6 py-3 border-b border-border">
          <TouchableOpacity onPress={exitSelect} className="mr-3">
            <Ionicons name="close" size={26} color={COLORS.text} />
          </TouchableOpacity>
          <Text
            className="text-text flex-1"
            style={{ fontSize: 17, fontWeight: '900', letterSpacing: -0.3, textTransform: 'uppercase' }}
          >
            Đã chọn {selected.size}
          </Text>
          <TouchableOpacity
            onPress={() => {
              const allIds = filteredItems.map((i) => i.id);
              setSelected(new Set(allIds));
            }}
            className="bg-surface rounded-pill px-3 py-1.5"
          >
            <Text className="text-text text-[12px] font-bold" style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Tất cả
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-row items-center px-6 py-3 border-b border-border">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <Ionicons name="chevron-back" size={26} color={COLORS.primaryDark} />
          </TouchableOpacity>
          <View
            style={{ backgroundColor: folder.color || COLORS.primary }}
            className="w-9 h-9 rounded-full items-center justify-center mr-3"
          >
            <Ionicons
              name={(folder.iconName as any) || 'folder'}
              size={18}
              color="#fff"
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
      )}

      {uploadProgress.length > 0 && !selectMode && (
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
          {errorUploads > 0 && activeUploads.length === 0 && (
            <View className="flex-row mt-3">
              <TouchableOpacity
                onPress={retryAllFailed}
                className="bg-primary rounded-pill px-4 py-1.5 mr-2 flex-row items-center"
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={13} color="#fff" />
                <Text
                  className="text-white text-[12px] font-bold ml-1"
                  style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
                >
                  Thử lại {errorUploads}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={dismissUploadProgress}
                className="bg-surfaceAlt rounded-pill px-4 py-1.5 flex-row items-center"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={13} color={COLORS.text} />
                <Text
                  className="text-text text-[12px] font-bold ml-1"
                  style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
                >
                  Bỏ qua
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {!selectMode && (folder.members && folder.members.length > 0 || folder.ownerId !== user?.uid) && (
        <View className="mx-6 mt-3 flex-row items-center">
          <TouchableOpacity
            onPress={() => setMembersOpen(true)}
            className="bg-surface flex-row items-center px-3 py-1.5 rounded-pill"
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={12} color={COLORS.primary} />
            <Text
              className="text-text font-semibold ml-1"
              style={{ fontSize: 12, letterSpacing: 0.3 }}
            >
              {(folder.members?.length ?? 0) + 1} thành viên
            </Text>
            <Ionicons name="chevron-forward" size={12} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      )}

      {folder.shareCode && !selectMode && (
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

      {/* Search + filter + sort (ẩn khi select mode) */}
      {!selectMode && mediaItems.length > 0 && (
        <>
          <View className="px-6 mt-4 mb-3">
            <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm file theo tên hoặc caption..." />
          </View>
          <View className="mb-2">
            <FilterChips<TypeFilter>
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { key: 'all', label: 'Tất cả', count: mediaItems.length },
                { key: 'image', label: 'Ảnh', count: imageCount },
                { key: 'video', label: 'Video', count: videoCount },
              ]}
            />
          </View>
          <View className="flex-row justify-between items-center px-6 mt-2 mb-3">
            <Text className="text-textSecondary text-[12px]">{filteredItems.length} file</Text>
            <PressableScale
              onPress={() => setSortOpen(true)}
              scaleTo={0.95}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: COLORS.surface,
                borderRadius: 30,
              }}
            >
              <Ionicons name="swap-vertical" size={14} color={COLORS.text} />
              <Text
                style={{
                  marginLeft: 4,
                  fontSize: 12,
                  fontWeight: '700',
                  color: COLORS.text,
                }}
              >
                {SORT_OPTIONS.find((s) => s.key === sortKey)?.label.split(' ')[0] ?? 'Sắp xếp'}
              </Text>
            </PressableScale>
          </View>
        </>
      )}

      {isLoadingMedia ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : mediaItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="bg-surface w-20 h-20 rounded-full items-center justify-center mb-4">
            <Ionicons name="images-outline" size={36} color={COLORS.textMuted} />
          </View>
          <Text
            className="text-text mb-2"
            style={{ fontSize: 21, fontWeight: '900', letterSpacing: -0.3, textTransform: 'uppercase' }}
          >
            Thư mục trống
          </Text>
          <Text className="text-textSecondary text-center mb-6" style={{ fontSize: 14 }}>
            Nhấn + để thêm ảnh hoặc video vào thư mục này.
          </Text>
          <PressableScale
            onPress={handleAddMedia}
            haptic
            style={{
              backgroundColor: COLORS.primary,
              height: 44,
              paddingHorizontal: 24,
              borderRadius: 30,
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: '800',
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                lineHeight: 44,
              }}
            >
              Thêm media
            </Text>
          </PressableScale>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 4, paddingTop: 6, paddingBottom: selectMode ? 96 : 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingMedia}
              onRefresh={loadMedia}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {/* Bulk action bar — floating bottom */}
      {selectMode && selected.size > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 24,
            backgroundColor: COLORS.primary,
            borderRadius: 30,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 8,
          }}
        >
          <BulkAction
            icon="cloud-download-outline"
            label="Tải"
            onPress={bulkDownload}
            disabled={bulkLoading}
          />
          <BulkAction
            icon="share-outline"
            label="Chia sẻ"
            onPress={bulkShare}
            disabled={bulkLoading}
          />
          <BulkAction
            icon="trash-outline"
            label="Xoá"
            onPress={bulkDelete}
            disabled={bulkLoading}
          />
          {bulkLoading && (
            <View
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
                borderRadius: 30,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </View>
      )}

      <SortSheet<SortKey>
        visible={sortOpen}
        options={SORT_OPTIONS}
        value={sortKey}
        onSelect={setSortKey}
        onClose={() => setSortOpen(false)}
      />

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

      {user && (
        <MembersModal
          visible={membersOpen}
          folderId={folder.id}
          folderName={folder.name}
          ownerId={folder.ownerId}
          memberIds={folder.members ?? []}
          currentUid={user.uid}
          onClose={() => setMembersOpen(false)}
          onMembersChanged={(newMembers) => {
            updateFolder(folder.id, { members: newMembers });
          }}
        />
      )}
    </SafeAreaView>
  );
};

const BulkAction = ({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.6}
    style={{
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 44,
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <Ionicons name={icon} size={18} color="#fff" />
    <Text
      style={{
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 6,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);
