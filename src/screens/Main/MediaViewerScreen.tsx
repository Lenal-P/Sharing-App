import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { HomeStackParamList, MediaItem } from '../../config/types';
import { COLORS } from '../../config/constants';
import { formatBytes } from '../../utils/formatters';

type RouteType = RouteProp<HomeStackParamList, 'MediaViewer'>;

const { width, height } = Dimensions.get('window');

export const MediaViewerScreen = () => {
  const route = useRoute<RouteType>();
  const navigation = useNavigation();
  const { mediaItems, startIndex } = route.params;

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [showInfo, setShowInfo] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const currentItem: MediaItem = mediaItems[currentIndex];

  const renderItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <View style={{ width, height }} className="bg-black items-center justify-center">
      {item.type === 'video' ? (
        <Video
          source={{ uri: item.url }}
          style={{ width, height: height * 0.85 }}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          shouldPlay={index === currentIndex}
          isLooping={false}
        />
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
            {currentIndex + 1} / {mediaItems.length}
          </Text>
          <TouchableOpacity onPress={() => setShowInfo(!showInfo)} className="p-2">
            <Ionicons name="information-circle-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Image/Video List */}
      <FlatList
        ref={flatListRef}
        data={mediaItems}
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
