import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Modal,
  Alert,
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
  const flatListRef = useRef<FlatList>(null);

  const currentItem: MediaItem | undefined = items[currentIndex];

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
        {currentItem?.caption ? (
          <Text className="text-white text-sm mb-2">{currentItem.caption}</Text>
        ) : null}
        <View className="flex-row items-center">
          <Ionicons
            name={currentItem?.type === 'video' ? 'videocam-outline' : 'image-outline'}
            size={16}
            color={COLORS.textSecondary}
          />
          <Text className="text-textSecondary text-xs ml-1">
            {currentItem?.fileName}
          </Text>
          <Text className="text-textMuted text-xs ml-3">
            {formatBytes(currentItem?.fileSize || 0)}
          </Text>
        </View>
      </View>

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
