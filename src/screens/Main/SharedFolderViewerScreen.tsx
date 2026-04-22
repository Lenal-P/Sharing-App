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
const ITEM_SIZE = (width - 48 - 4) / 3;

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
        <Ionicons name="alert-circle-outline" size={44} color={COLORS.textMuted as string} />
        <Text
          className="text-text font-semibold mt-3 mb-1"
          style={{ fontSize: 21, letterSpacing: -0.231 }}
        >
          Không tìm thấy
        </Text>
        <Text className="text-textSecondary text-center text-[14px]">
          Mã chia sẻ đã hết hạn hoặc thư mục không còn công khai.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-6 bg-primary rounded-xs h-11 px-6 items-center justify-center"
          activeOpacity={0.85}
        >
          <Text className="text-white font-semibold text-[15px]">Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const color = folder.color || COLORS.primary;
  const iconName = (folder.iconName as any) || 'folder';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center px-6 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="chevron-back" size={26} color={COLORS.primaryDark} />
        </TouchableOpacity>
        <View
          style={{ backgroundColor: color + '1A' }}
          className="w-9 h-9 rounded-micro items-center justify-center mr-3"
        >
          <Ionicons name={iconName} size={18} color={color} />
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
      </View>

      {folder.description ? (
        <View className="mx-6 mt-3 bg-surface rounded-lg px-4 py-3">
          <Text className="text-textSecondary text-[14px]" style={{ letterSpacing: -0.224 }}>
            {folder.description}
          </Text>
        </View>
      ) : null}

      <View className="mx-6 mt-3 flex-row items-center">
        <View className="bg-primary/10 flex-row items-center px-3 py-1.5 rounded-pill">
          <Ionicons name="eye-outline" size={12} color={COLORS.primary} />
          <Text className="text-primary text-[12px] font-semibold ml-1">Chế độ xem</Text>
        </View>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="images-outline" size={40} color={COLORS.textMuted as string} />
          <Text className="text-textSecondary text-[14px] mt-3">Thư mục này chưa có file nào</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 4, paddingTop: 10 }}
        />
      )}
    </SafeAreaView>
  );
};
