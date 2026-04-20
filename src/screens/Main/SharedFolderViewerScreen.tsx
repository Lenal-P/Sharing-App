import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SharedStackParamList, Folder, MediaItem } from '../../config/types';
import { COLORS } from '../../config/constants';
import { FirestoreService } from '../../services/firestore.service';
import { formatBytes } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<SharedStackParamList, 'SharedFolder'>;
type RouteType = RouteProp<SharedStackParamList, 'SharedFolder'>;

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 40 - 8) / 3;

export const SharedFolderViewerScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { shareCode } = route.params;

  const [folder, setFolder] = useState<Folder | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const f = await FirestoreService.getFolderByShareCode(shareCode);
        if (!f) {
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
    })();
  }, [shareCode]);

  const renderItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <TouchableOpacity
      style={{ width: ITEM_SIZE, height: ITEM_SIZE, margin: 2 }}
      onPress={() =>
        navigation.navigate('SharedMediaViewer', { mediaItems: items, startIndex: index })
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!folder) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
        <Text className="text-white text-lg font-bold mt-3 mb-1">Không tìm thấy</Text>
        <Text className="text-textSecondary text-sm text-center">
          Mã chia sẻ đã hết hạn hoặc thư mục không còn công khai.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-6 bg-primary px-6 py-2 rounded-xl"
        >
          <Text className="text-white font-semibold">Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const color = folder.color || COLORS.primary;
  const iconName = (folder.iconName as any) || 'folder';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center px-5 py-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View
          style={{ backgroundColor: color + '33' }}
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
        >
          <Ionicons name={iconName} size={18} color={color} />
        </View>
        <View className="flex-1">
          <Text className="text-white text-lg font-bold" numberOfLines={1}>
            {folder.name}
          </Text>
          <Text className="text-textSecondary text-xs mt-0.5">
            {folder.mediaCount} file · {formatBytes(folder.totalSize)}
          </Text>
        </View>
      </View>

      {folder.description ? (
        <View className="mx-5 mb-3 bg-card rounded-xl px-4 py-3">
          <Text className="text-textSecondary text-sm">{folder.description}</Text>
        </View>
      ) : null}

      <View className="mx-5 mb-3 flex-row items-center">
        <View className="bg-accent/20 flex-row items-center px-3 py-2 rounded-lg">
          <Ionicons name="eye-outline" size={14} color={COLORS.accent} />
          <Text className="text-accent text-xs font-semibold ml-1">Chế độ xem</Text>
        </View>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="images-outline" size={44} color={COLORS.textMuted} />
          <Text className="text-textSecondary text-sm mt-3">Thư mục này chưa có file nào</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 4 }}
        />
      )}
    </SafeAreaView>
  );
};
