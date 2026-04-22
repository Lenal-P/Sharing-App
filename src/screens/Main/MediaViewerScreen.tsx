import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Modal,
  Alert,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useState, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { HomeStackParamList, MediaItem } from '../../config/types';
import { COLORS } from '../../config/constants';
import { formatBytes } from '../../utils/formatters';
import { FirestoreService } from '../../services/firestore.service';
import { useAuthStore } from '../../store/authStore';
import { useFolderStore } from '../../store/folderStore';
import { downloadToGallery } from '../../utils/downloadMedia';
import { CommentsSheet } from '../../components/CommentsSheet';
import * as Haptics from 'expo-haptics';

type RouteType = RouteProp<HomeStackParamList, 'MediaViewer'>;

const { width, height } = Dimensions.get('window');

export const MediaViewerScreen = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation();
  const { mediaItems: initialItems, startIndex, readOnly } = route.params;

  const { user } = useAuthStore();
  const { removeMediaItem } = useFolderStore();

  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [showInfo, setShowInfo] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadPct, setDownloadPct] = useState(0);
  const [captionEditOpen, setCaptionEditOpen] = useState(false);
  const [captionInput, setCaptionInput] = useState('');
  const [captionSaving, setCaptionSaving] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const folderOwnerId =
    useFolderStore((s) => s.folders.find((f) => f.id === items[currentIndex]?.folderId)?.ownerId) ??
    items[currentIndex]?.ownerId ??
    '';

  const currentItem: MediaItem | undefined = items[currentIndex];

  const handleShareOut = async () => {
    if (!currentItem) return;
    try {
      await Share.share({
        message: currentItem.caption
          ? `${currentItem.caption}\n${currentItem.url}`
          : currentItem.url,
        url: currentItem.url,
      });
    } catch (e) {
      console.warn('Share huỷ:', e);
    }
  };

  const openCaptionEdit = () => {
    if (!currentItem) return;
    setCaptionInput(currentItem.caption ?? '');
    setCaptionEditOpen(true);
  };

  const saveCaption = async () => {
    if (!currentItem) return;
    const next = captionInput.trim();
    try {
      setCaptionSaving(true);
      await FirestoreService.updateMediaItem(currentItem.folderId, currentItem.id, {
        caption: next || undefined,
      });
      const updated = { ...currentItem, caption: next || undefined };
      setItems(items.map((m) => (m.id === currentItem.id ? updated : m)));
      setCaptionEditOpen(false);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể lưu caption');
    } finally {
      setCaptionSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!currentItem || downloading) return;
    try {
      setDownloading(true);
      setDownloadPct(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await downloadToGallery(currentItem.url, currentItem.fileName, setDownloadPct);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Đã lưu', `"${currentItem.fileName}" đã vào album Sharing trong thư viện.`);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Lỗi tải về', err?.message || 'Không thể tải file. Thử lại sau.');
    } finally {
      setDownloading(false);
      setDownloadPct(0);
    }
  };

  const handleDelete = () => {
    if (!currentItem || !user) return;
    Alert.alert('Xoá file này?', `"${currentItem.fileName}" sẽ bị xoá vĩnh viễn.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await FirestoreService.deleteMediaItem(currentItem, user.uid);
            removeMediaItem(currentItem.id);
            const next = items.filter((m) => m.id !== currentItem.id);
            if (next.length === 0) {
              navigation.goBack();
              return;
            }
            setItems(next);
            setCurrentIndex(Math.min(currentIndex, next.length - 1));
          } catch (err: any) {
            Alert.alert('Lỗi', err?.message || 'Không thể xoá file');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <View style={{ width, height }} className="bg-black items-center justify-center">
      {item.type === 'video' ? (
        <VideoSlide uri={item.url} isActive={index === currentIndex} />
      ) : (
        <Image
          source={{ uri: item.url }}
          style={{ width, height: height * 0.85 }}
          contentFit="contain"
          transition={200}
        />
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />

      {/* Top Controls */}
      <View
        className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pb-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2"
          >
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white font-medium">
            {currentIndex + 1} / {items.length}
          </Text>
          <View className="flex-row">
            <TouchableOpacity onPress={() => setCommentsOpen(true)} className="p-2 mr-1">
              <Ionicons name="chatbubble-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShareOut} className="p-2 mr-1">
              <Ionicons name="share-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDownload} disabled={downloading} className="p-2 mr-1">
              <Ionicons name="cloud-download-outline" size={24} color="#fff" />
            </TouchableOpacity>
            {!readOnly && (
              <TouchableOpacity onPress={handleDelete} className="p-2 mr-1">
                <Ionicons name="trash-outline" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowInfo(!showInfo)} className="p-2">
              <Ionicons name="information-circle-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        {downloading && (
          <View className="mt-3">
            <View className="h-[3px] bg-white/20 rounded-full overflow-hidden">
              <View
                style={{
                  width: `${downloadPct}%`,
                  backgroundColor: '#fff',
                  height: '100%',
                }}
              />
            </View>
            <Text className="text-white/80 text-[11px] mt-1.5" style={{ letterSpacing: 0.3 }}>
              Đang tải về thư viện... {Math.round(downloadPct)}%
            </Text>
          </View>
        )}
      </View>

      {/* Image/Video List */}
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
        renderItem={renderItem}
      />

      {/* Bottom bar */}
      <View
        className="absolute bottom-0 left-0 right-0 px-5 pb-10 pt-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        {!readOnly ? (
          <TouchableOpacity onPress={openCaptionEdit} activeOpacity={0.7}>
            {currentItem?.caption ? (
              <Text className="text-white text-sm mb-2" style={{ lineHeight: 20 }}>
                {currentItem.caption}
              </Text>
            ) : (
              <View className="flex-row items-center mb-2">
                <Ionicons name="create-outline" size={14} color="rgba(255,255,255,0.6)" />
                <Text className="text-white/60 text-[13px] ml-1.5 italic">
                  Thêm caption...
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : currentItem?.caption ? (
          <Text className="text-white text-sm mb-2" style={{ lineHeight: 20 }}>
            {currentItem.caption}
          </Text>
        ) : null}
        <View className="flex-row items-center">
          <Ionicons
            name={currentItem?.type === 'video' ? 'videocam-outline' : 'image-outline'}
            size={16}
            color="rgba(255,255,255,0.72)"
          />
          <Text className="text-white/72 text-xs ml-1">
            {currentItem?.fileName}
          </Text>
          <Text className="text-white/48 text-xs ml-3">
            {formatBytes(currentItem?.fileSize || 0)}
          </Text>
        </View>
      </View>

      {/* Caption edit modal */}
      <Modal
        visible={captionEditOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCaptionEditOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 24 }}
        >
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: -0.3,
                color: COLORS.text,
                marginBottom: 12,
              }}
            >
              Caption
            </Text>
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                minHeight: 90,
                marginBottom: 16,
              }}
            >
              <TextInput
                value={captionInput}
                onChangeText={setCaptionInput}
                placeholder="Nhập caption cho file này..."
                placeholderTextColor={COLORS.textMuted}
                style={{ color: COLORS.text, fontSize: 15, textAlignVertical: 'top' }}
                multiline
                maxLength={500}
                autoFocus
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
              />
            </View>
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setCaptionEditOpen(false)}
                disabled={captionSaving}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 30,
                  backgroundColor: COLORS.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 14,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                  }}
                >
                  Huỷ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveCaption}
                disabled={captionSaving}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 30,
                  backgroundColor: COLORS.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                  }}
                >
                  {captionSaving ? 'Đang lưu...' : 'Lưu'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Info Modal */}
      <Modal
        visible={showInfo}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInfo(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-end"
          activeOpacity={1}
          onPress={() => setShowInfo(false)}
        >
          <View className="bg-surface rounded-t-3xl p-6">
            <Text className="text-white text-lg font-bold mb-4">Thông tin media</Text>
            <InfoRow label="Tên file" value={currentItem?.fileName || ''} />
            <InfoRow label="Loại" value={currentItem?.type === 'video' ? 'Video' : 'Ảnh'} />
            <InfoRow label="Kích thước" value={formatBytes(currentItem?.fileSize || 0)} />
            {currentItem?.width && currentItem?.height && (
              <InfoRow
                label="Độ phân giải"
                value={`${currentItem.width} × ${currentItem.height}`}
              />
            )}
            {currentItem?.duration && (
              <InfoRow
                label="Thời lượng"
                value={`${Math.round(currentItem.duration)}s`}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Comments sheet */}
      {currentItem && (
        <CommentsSheet
          visible={commentsOpen}
          folderId={currentItem.folderId}
          itemId={currentItem.id}
          currentUser={user}
          folderOwnerId={folderOwnerId}
          onClose={() => setCommentsOpen(false)}
        />
      )}
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row justify-between py-3 border-b border-border">
    <Text className="text-textSecondary">{label}</Text>
    <Text className="text-white font-medium" numberOfLines={1} style={{ maxWidth: '60%' }}>
      {value}
    </Text>
  </View>
);

const VideoSlide = ({ uri, isActive }: { uri: string; isActive: boolean }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]);

  return (
    <VideoView
      player={player}
      style={{ width, height: height * 0.85 }}
      contentFit="contain"
      nativeControls
      allowsFullscreen
    />
  );
};
