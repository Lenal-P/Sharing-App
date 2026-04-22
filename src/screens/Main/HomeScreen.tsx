import { View, Text, FlatList, RefreshControl, ActivityIndicator, Alert, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/constants';
import { useFolderStore } from '../../store/folderStore';
import { useEffect, useCallback, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { FirestoreService } from '../../services/firestore.service';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList, Folder } from '../../config/types';
import { formatBytes } from '../../utils/formatters';
import { PressableScale } from '../../components/PressableScale';
import { FadeInView } from '../../components/FadeInView';
import { SearchBar } from '../../components/SearchBar';
import { FilterChips } from '../../components/FilterChips';
import { SortSheet, SortOption } from '../../components/SortSheet';
import { useCountUp } from '../../hooks/useCountUp';
import * as Haptics from 'expo-haptics';

type VisibilityFilter = 'all' | 'public' | 'private';
type SortKey = 'updated' | 'created' | 'name' | 'size' | 'count';

const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: 'updated', label: 'Cập nhật gần nhất', icon: 'time-outline' },
  { key: 'created', label: 'Mới tạo', icon: 'calendar-outline' },
  { key: 'name', label: 'Tên (A → Z)', icon: 'text-outline' },
  { key: 'size', label: 'Dung lượng (lớn → nhỏ)', icon: 'server-outline' },
  { key: 'count', label: 'Nhiều file nhất', icon: 'layers-outline' },
];

const applySort = (list: Folder[], key: SortKey): Folder[] => {
  const copy = [...list];
  switch (key) {
    case 'updated':
      return copy.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    case 'created':
      return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    case 'size':
      return copy.sort((a, b) => b.totalSize - a.totalSize);
    case 'count':
      return copy.sort((a, b) => b.mediaCount - a.mediaCount);
    default:
      return copy;
  }
};

type Nav = NativeStackNavigationProp<HomeStackParamList, 'FolderList'>;

export const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const { folders, setFolders, deleteFolder, isLoadingFolders, setLoadingFolders } = useFolderStore();

  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortOpen, setSortOpen] = useState(false);

  const filteredFolders = useMemo(() => {
    let list = folders;
    if (visibility === 'public') list = list.filter((f) => f.isPublic);
    else if (visibility === 'private') list = list.filter((f) => !f.isPublic);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q)
      );
    }
    return applySort(list, sortKey);
  }, [folders, visibility, sortKey, search]);

  const publicCount = useMemo(() => folders.filter((f) => f.isPublic).length, [folders]);
  const privateCount = folders.length - publicCount;

  const loadFolders = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingFolders(true);
      const list = await FirestoreService.getFoldersByUser(user.uid);
      setFolders(list);
    } catch (err) {
      console.error('Lỗi tải thư mục:', err);
    } finally {
      setLoadingFolders(false);
    }
  }, [user]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleLongPress = (folder: Folder) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(folder.name, 'Chọn hành động', [
      { text: 'Sửa', onPress: () => navigation.navigate('CreateFolder', { mode: 'edit', folderId: folder.id }) },
      { text: 'Xoá', style: 'destructive', onPress: () => confirmDelete(folder) },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  const confirmDelete = (folder: Folder) => {
    Alert.alert(
      'Xoá thư mục?',
      `Tất cả ${folder.mediaCount} file trong "${folder.name}" sẽ bị xoá vĩnh viễn.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await FirestoreService.deleteFolder(folder.id, user.uid);
              deleteFolder(folder.id);
            } catch (err: any) {
              Alert.alert('Lỗi', err?.message || 'Không thể xoá thư mục');
            }
          },
        },
      ]
    );
  };

  const totalMedia = folders.reduce((s, f) => s + f.mediaCount, 0);
  const totalBytes = folders.reduce((s, f) => s + f.totalSize, 0);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Dark hero block — Nike alternating rhythm */}
      <FadeInView>
        <View
          style={{
            backgroundColor: COLORS.primary,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 32,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          <View className="flex-row justify-between items-start mb-8">
            <View className="flex-1 mr-3">
              <Text
                className="text-[11px] font-bold mb-2"
                style={{ color: COLORS.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' }}
              >
                Welcome back
              </Text>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 36,
                  lineHeight: 40,
                  letterSpacing: -0.5,
                  fontWeight: '900',
                  textTransform: 'uppercase',
                }}
                numberOfLines={1}
              >
                {user?.displayName || 'You'}
              </Text>
            </View>
            <PressableScale
              onPress={() => navigation.navigate('CreateFolder')}
              haptic
              style={{
                backgroundColor: '#fff',
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="add" size={24} color={COLORS.primary} />
            </PressableScale>
          </View>

          {/* Stats in hero */}
          <View className="flex-row">
            <HeroStatBox value={folders.length} label="Thư mục" />
            <View className="w-px" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <HeroStatBox value={totalMedia} label="Mục" />
            <View className="w-px" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            <HeroStatBox value={formatBytes(totalBytes, 0)} label="Đã dùng" />
          </View>
        </View>
      </FadeInView>

      {/* Search bar */}
      <FadeInView delay={120}>
        <View className="px-6 mt-5 mb-3">
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm thư mục..."
          />
        </View>
      </FadeInView>

      {/* Filter chips */}
      <FadeInView delay={160}>
        <View className="mb-3">
          <FilterChips<VisibilityFilter>
            value={visibility}
            onChange={setVisibility}
            options={[
              { key: 'all', label: 'Tất cả', count: folders.length },
              { key: 'public', label: 'Công khai', count: publicCount },
              { key: 'private', label: 'Riêng tư', count: privateCount },
            ]}
          />
        </View>
      </FadeInView>

      {/* Section heading with sort */}
      <FadeInView delay={200}>
        <View className="flex-row justify-between items-center px-6 mt-2 mb-3">
          <Text
            className="text-text"
            style={{
              fontSize: 20,
              lineHeight: 24,
              letterSpacing: -0.3,
              fontWeight: '800',
              textTransform: 'uppercase',
            }}
          >
            {filteredFolders.length} thư mục
          </Text>
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
      </FadeInView>

      {/* List */}
      <View className="flex-1 px-6">
        {isLoadingFolders && folders.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : folders.length === 0 ? (
          <EmptyState onCreate={() => navigation.navigate('CreateFolder')} />
        ) : filteredFolders.length === 0 ? (
          <NoMatch onClearFilters={() => { setSearch(''); setVisibility('all'); }} />
        ) : (
          <FlatList
            data={filteredFolders}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoadingFolders}
                onRefresh={loadFolders}
                tintColor={COLORS.primary}
              />
            }
            renderItem={({ item, index }) => (
              <FolderCard
                item={item}
                index={index}
                onPress={() => navigation.navigate('FolderDetail', { folderId: item.id })}
                onLongPress={() => handleLongPress(item)}
              />
            )}
          />
        )}
      </View>

      <SortSheet<SortKey>
        visible={sortOpen}
        options={SORT_OPTIONS}
        value={sortKey}
        onSelect={setSortKey}
        onClose={() => setSortOpen(false)}
      />
    </SafeAreaView>
  );
};

const NoMatch = ({ onClearFilters }: { onClearFilters: () => void }) => (
  <View className="flex-1 items-center justify-center pb-20 px-10">
    <Ionicons name="search-outline" size={36} color={COLORS.textMuted} />
    <Text
      className="text-text mt-3 mb-1"
      style={{ fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.2 }}
    >
      Không có kết quả
    </Text>
    <Text className="text-textSecondary text-center text-[14px] mb-4">
      Thử đổi từ khoá hoặc bỏ bộ lọc.
    </Text>
    <PressableScale
      onPress={onClearFilters}
      scaleTo={0.96}
      style={{
        backgroundColor: COLORS.primary,
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 30,
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        Xoá bộ lọc
      </Text>
    </PressableScale>
  </View>
);

const HeroStatBox = ({ value, label }: { value: number | string; label: string }) => {
  const isNumber = typeof value === 'number';
  const counted = useCountUp(isNumber ? (value as number) : 0, 900);
  const display = isNumber ? counted : value;
  return (
    <View className="flex-1 items-center">
      <Text
        style={{
          color: '#fff',
          fontSize: 24,
          lineHeight: 28,
          letterSpacing: -0.5,
          fontWeight: '900',
        }}
      >
        {display}
      </Text>
      <Text
        className="text-[10px] font-bold mt-1"
        style={{ color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}
      >
        {label}
      </Text>
    </View>
  );
};

const FolderCard = ({
  item,
  index,
  onPress,
  onLongPress,
}: {
  item: Folder;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const color = item.color || COLORS.primary;
  const iconName = (item.iconName as any) || 'folder';
  const hasCover = !!item.coverUrl;

  return (
    <FadeInView delay={index * 40} style={{ width: '48%', marginBottom: 12 }}>
      <PressableScale onPress={onPress} onLongPress={onLongPress} scaleTo={0.96}>
        {hasCover ? (
          <ImageBackground
            source={{ uri: item.coverUrl }}
            style={{ height: 180, justifyContent: 'flex-end', overflow: 'hidden' }}
            imageStyle={{ borderRadius: 20 }}
          >
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.55)',
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
              }}
            >
              <Text
                style={{ color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text
                style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}
              >
                {item.mediaCount} mục · {formatBytes(item.totalSize, 0)}
              </Text>
            </View>
            {item.isPublic && (
              <View
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  backgroundColor: COLORS.primary,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 30,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                  }}
                >
                  Public
                </Text>
              </View>
            )}
          </ImageBackground>
        ) : (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 20,
              padding: 16,
              minHeight: 140,
            }}
          >
            <View
              style={{ backgroundColor: color }}
              className="w-11 h-11 rounded-full items-center justify-center mb-4"
            >
              <Ionicons name={iconName} size={20} color="#fff" />
            </View>
            <Text
              className="text-text font-semibold text-[16px]"
              style={{ lineHeight: 20 }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text className="text-textSecondary text-[14px] mt-1" style={{ lineHeight: 20 }}>
              {item.mediaCount} mục · {formatBytes(item.totalSize, 0)}
            </Text>
            {item.isPublic && (
              <View
                className="flex-row items-center mt-3"
                style={{ alignSelf: 'flex-start' }}
              >
                <View className="bg-primary px-2 py-0.5 rounded-pill">
                  <Text
                    className="text-white text-[10px] font-bold"
                    style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Public
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </PressableScale>
    </FadeInView>
  );
};

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <View className="flex-1 items-center justify-center pb-20">
    <View className="bg-surface w-20 h-20 rounded-full items-center justify-center mb-5">
      <Ionicons name="folder-open-outline" size={36} color={COLORS.textSecondary} />
    </View>
    <Text
      className="text-text mb-2"
      style={{
        fontSize: 24,
        letterSpacing: -0.3,
        fontWeight: '900',
        textTransform: 'uppercase',
      }}
    >
      Chưa có gì
    </Text>
    <Text
      className="text-textSecondary text-center mb-6 px-8 text-[15px]"
      style={{ lineHeight: 22 }}
    >
      Tạo thư mục đầu tiên để bắt đầu lưu trữ ảnh và video.
    </Text>
    <PressableScale
      onPress={onCreate}
      haptic
      style={{
        backgroundColor: COLORS.primary,
        height: 48,
        paddingHorizontal: 28,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Text
        className="text-white font-semibold text-[16px]"
        style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
      >
        Tạo thư mục
      </Text>
    </PressableScale>
  </View>
);
