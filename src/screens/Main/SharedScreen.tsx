import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  ImageBackground,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/constants';
import { FirestoreService } from '../../services/firestore.service';
import { Folder, SharedStackParamList } from '../../config/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { PressableScale } from '../../components/PressableScale';
import { FadeInView } from '../../components/FadeInView';
import { SearchBar } from '../../components/SearchBar';
import { FilterChips } from '../../components/FilterChips';
import { SortSheet, SortOption } from '../../components/SortSheet';
import { formatBytes } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<SharedStackParamList, 'SharedHome'>;

type SortKey = 'updated' | 'count' | 'size' | 'name';
const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: 'updated', label: 'Mới cập nhật', icon: 'time-outline' },
  { key: 'count', label: 'Nhiều file nhất', icon: 'layers-outline' },
  { key: 'size', label: 'Dung lượng lớn', icon: 'server-outline' },
  { key: 'name', label: 'Tên (A → Z)', icon: 'text-outline' },
];

type OwnerFilter = 'all' | string; // 'all' or specific ownerId

const applySort = (list: Folder[], key: SortKey): Folder[] => {
  const copy = [...list];
  switch (key) {
    case 'updated':
      return copy.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    case 'count':
      return copy.sort((a, b) => b.mediaCount - a.mediaCount);
    case 'size':
      return copy.sort((a, b) => b.totalSize - a.totalSize);
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    default:
      return copy;
  }
};

export const SharedScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const [shareCode, setShareCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [publicFolders, setPublicFolders] = useState<Folder[]>([]);
  const [sharedFolders, setSharedFolders] = useState<Folder[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortOpen, setSortOpen] = useState(false);

  // Password prompt khi join folder private
  const [pwdFolder, setPwdFolder] = useState<Folder | null>(null);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      setLoadingFeed(true);
      const [publicList, sharedList] = await Promise.all([
        FirestoreService.getPublicFolders(user?.uid),
        user ? FirestoreService.getSharedFoldersForUser(user.uid) : Promise.resolve([]),
      ]);
      setPublicFolders(publicList);
      setSharedFolders(sharedList);
    } catch (err) {
      console.error('Lỗi tải feed:', err);
    } finally {
      setLoadingFeed(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const openFolder = async (folder: Folder) => {
    // Owner hoặc đã là member → vào thẳng
    if (user && (folder.ownerId === user.uid || folder.members?.includes(user.uid))) {
      navigation.navigate('SharedFolder', {
        folderId: folder.id,
        shareCode: folder.shareCode ?? '',
      });
      return;
    }
    // Folder có password → prompt
    if (folder.passwordHash) {
      setPwdFolder(folder);
      setPwdInput('');
      return;
    }
    // Folder public không password hoặc private no password → auto join (nếu có user)
    if (user) {
      try {
        await FirestoreService.joinFolder(folder.id, user.uid);
      } catch (e) {
        console.warn('Join folder thất bại:', e);
      }
    }
    navigation.navigate('SharedFolder', {
      folderId: folder.id,
      shareCode: folder.shareCode ?? '',
    });
  };

  const handleSearch = async () => {
    const code = shareCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Thiếu mã', 'Vui lòng nhập mã chia sẻ');
      return;
    }
    try {
      setIsLoading(true);
      const folder = await FirestoreService.getFolderByShareCode(code);
      if (folder) {
        await openFolder(folder);
      } else {
        Alert.alert('Không tìm thấy', 'Mã chia sẻ không hợp lệ hoặc đã hết hạn.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể tìm kiếm. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!pwdFolder || !user) return;
    if (!pwdInput.trim()) {
      Alert.alert('Thiếu mật khẩu', 'Vui lòng nhập mật khẩu.');
      return;
    }
    try {
      setPwdLoading(true);
      const ok = await FirestoreService.verifyFolderPassword(pwdFolder.id, pwdInput.trim());
      if (!ok) {
        Alert.alert('Sai mật khẩu', 'Mật khẩu không đúng. Vui lòng thử lại.');
        return;
      }
      await FirestoreService.joinFolder(pwdFolder.id, user.uid);
      const folderId = pwdFolder.id;
      const shareCode = pwdFolder.shareCode ?? '';
      setPwdFolder(null);
      setPwdInput('');
      navigation.navigate('SharedFolder', { folderId, shareCode });
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể kiểm tra mật khẩu.');
    } finally {
      setPwdLoading(false);
    }
  };

  // Danh sách các user đăng (unique ownerId → displayName + count)
  const owners = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const f of publicFolders) {
      const name = f.ownerDisplayName || 'Người dùng';
      const existing = map.get(f.ownerId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(f.ownerId, { id: f.ownerId, name, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [publicFolders]);

  const filtered = useMemo(() => {
    let list = publicFolders;
    if (ownerFilter !== 'all') list = list.filter((f) => f.ownerId === ownerFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q) ||
          f.ownerDisplayName?.toLowerCase().includes(q)
      );
    }
    return applySort(list, sortKey);
  }, [publicFolders, search, ownerFilter, sortKey]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingFeed}
            onRefresh={loadFeed}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <FadeInView>
              <View className="px-6 pt-6 pb-5">
                <Text
                  className="text-textSecondary text-[12px] font-semibold mb-2"
                  style={{ letterSpacing: 1, textTransform: 'uppercase' }}
                >
                  Khám phá
                </Text>
                <Text
                  className="text-text"
                  style={{
                    fontSize: 36,
                    lineHeight: 40,
                    letterSpacing: -0.5,
                    fontWeight: '900',
                    textTransform: 'uppercase',
                  }}
                >
                  Share
                </Text>
                <Text className="text-textSecondary mt-2 text-[15px]" style={{ lineHeight: 22 }}>
                  Nhập mã để mở thư mục riêng, hoặc khám phá feed công khai.
                </Text>
              </View>
            </FadeInView>

            {/* Share code input */}
            <FadeInView delay={80}>
              <View className="px-6 mb-5">
                <Text
                  className="text-textSecondary text-[11px] font-bold mb-2"
                  style={{ letterSpacing: 1, textTransform: 'uppercase' }}
                >
                  Nhập mã chia sẻ
                </Text>
                <View
                  className="bg-surface flex-row items-center px-4 h-12"
                  style={{ borderRadius: 24 }}
                >
                  <Ionicons name="key-outline" size={18} color={COLORS.textSecondary} />
                  <TextInput
                    value={shareCode}
                    onChangeText={(t) => setShareCode(t.replace(/[^A-Za-z0-9]/g, ''))}
                    placeholder="ABC123"
                    placeholderTextColor={COLORS.textMuted}
                    style={{
                      color: COLORS.text,
                      fontSize: 17,
                      fontWeight: '600',
                      flex: 1,
                      marginHorizontal: 10,
                      letterSpacing: 3,
                      textTransform: 'uppercase',
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={8}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                  />
                  <TouchableOpacity
                    onPress={handleSearch}
                    disabled={isLoading}
                    className="bg-primary rounded-pill px-4 h-8 items-center justify-center"
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text
                        className="text-white text-[12px] font-bold"
                        style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}
                      >
                        Tìm
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </FadeInView>

            {/* Shared with me — folders user đã join */}
            {sharedFolders.length > 0 && (
              <FadeInView delay={100}>
                <View className="mb-5">
                  <View className="flex-row justify-between items-end px-6 mb-3">
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
                      Chia sẻ với bạn
                    </Text>
                    <Text className="text-textSecondary text-[12px]">
                      {sharedFolders.length} thư mục
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
                  >
                    {sharedFolders.map((f) => (
                      <SharedWithMeCard
                        key={f.id}
                        folder={f}
                        onPress={() =>
                          navigation.navigate('SharedFolder', {
                            folderId: f.id,
                            shareCode: f.shareCode ?? '',
                          })
                        }
                      />
                    ))}
                  </ScrollView>
                </View>
              </FadeInView>
            )}

            {/* Divider */}
            <View className="h-px bg-border mx-6 mb-5" />

            {/* Feed search + owner filter + sort */}
            <FadeInView delay={120}>
              <View className="px-6 mb-3">
                <SearchBar
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Tìm tên thư mục hoặc người đăng..."
                />
              </View>
            </FadeInView>

            {owners.length > 1 && (
              <FadeInView delay={160}>
                <View className="mb-3">
                  <FilterChips<OwnerFilter>
                    value={ownerFilter}
                    onChange={setOwnerFilter}
                    options={[
                      { key: 'all', label: 'Tất cả', count: publicFolders.length },
                      ...owners.map((o) => ({
                        key: o.id as OwnerFilter,
                        label: o.name,
                        count: o.count,
                      })),
                    ]}
                  />
                </View>
              </FadeInView>
            )}

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
                  {filtered.length} kết quả
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
          </View>
        }
        ListEmptyComponent={
          loadingFeed ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : (
            <View className="px-10 py-12 items-center">
              <View className="bg-surface w-16 h-16 rounded-full items-center justify-center mb-4">
                <Ionicons name="share-social-outline" size={28} color={COLORS.textSecondary} />
              </View>
              <Text
                className="text-text text-center mb-1"
                style={{
                  fontSize: 17,
                  fontWeight: '900',
                  letterSpacing: -0.2,
                  textTransform: 'uppercase',
                }}
              >
                {search || ownerFilter !== 'all'
                  ? 'Không có kết quả'
                  : 'Chưa có thư mục công khai'}
              </Text>
              <Text className="text-textSecondary text-center text-[14px]">
                {search || ownerFilter !== 'all'
                  ? 'Thử đổi từ khoá hoặc bỏ bộ lọc.'
                  : 'Bật "Công khai" khi tạo/sửa thư mục để mọi người xem được.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <PublicFolderCard
            item={item}
            index={index}
            onPress={() => openFolder(item)}
          />
        )}
      />

      <SortSheet<SortKey>
        visible={sortOpen}
        options={SORT_OPTIONS}
        value={sortKey}
        onSelect={setSortKey}
        onClose={() => setSortOpen(false)}
      />

      {/* Password prompt modal */}
      <Modal
        visible={!!pwdFolder}
        transparent
        animationType="fade"
        onRequestClose={() => setPwdFolder(null)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-background w-full rounded-lg p-5">
            <View
              style={{
                backgroundColor: COLORS.primary + '12',
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Ionicons name="lock-closed" size={22} color={COLORS.primary} />
            </View>
            <Text
              className="text-text mb-1"
              style={{
                fontSize: 20,
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: -0.3,
              }}
            >
              Cần mật khẩu
            </Text>
            <Text className="text-textSecondary mb-4 text-[13px]" style={{ lineHeight: 18 }}>
              "{pwdFolder?.name}" yêu cầu mật khẩu để join. Sau khi join bạn có thể xem và upload.
            </Text>
            <View
              className="bg-surface flex-row items-center px-4 h-11 mb-5"
              style={{ borderRadius: 24 }}
            >
              <Ionicons name="key-outline" size={16} color={COLORS.textSecondary} />
              <TextInput
                value={pwdInput}
                onChangeText={setPwdInput}
                placeholder="Mật khẩu"
                placeholderTextColor={COLORS.textMuted}
                style={{ color: COLORS.text, fontSize: 15, flex: 1, marginLeft: 10 }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
                returnKeyType="done"
                onSubmitEditing={handleVerifyPassword}
                autoFocus
              />
            </View>
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setPwdFolder(null)}
                className="flex-1 bg-surface h-11 rounded-pill items-center justify-center mr-2"
                disabled={pwdLoading}
                activeOpacity={0.7}
              >
                <Text
                  className="text-text font-semibold text-[14px]"
                  style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
                >
                  Huỷ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleVerifyPassword}
                className="flex-1 bg-primary h-11 rounded-pill items-center justify-center ml-2"
                disabled={pwdLoading}
                activeOpacity={0.85}
              >
                {pwdLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    className="text-white font-semibold text-[14px]"
                    style={{ letterSpacing: 0.3, textTransform: 'uppercase' }}
                  >
                    Join
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const PublicFolderCard = ({
  item,
  index,
  onPress,
}: {
  item: Folder;
  index: number;
  onPress: () => void;
}) => {
  const color = item.color || COLORS.primary;
  const iconName = (item.iconName as any) || 'folder';
  const hasCover = !!item.coverUrl;
  const owner = item.ownerDisplayName || 'Người dùng';

  return (
    <FadeInView delay={index * 40} style={{ width: '48%', marginBottom: 12 }}>
      <PressableScale onPress={onPress} scaleTo={0.96}>
        {hasCover ? (
          <ImageBackground
            source={{ uri: item.coverUrl }}
            style={{ height: 180, justifyContent: 'flex-end', overflow: 'hidden' }}
            imageStyle={{ borderRadius: 20 }}
          >
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
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
                style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}
                numberOfLines={1}
              >
                @{owner} · {item.mediaCount} mục
              </Text>
            </View>
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
            <Text
              className="text-textSecondary text-[12px] mt-1"
              style={{ lineHeight: 16 }}
              numberOfLines={1}
            >
              @{owner}
            </Text>
            <Text className="text-textSecondary text-[13px] mt-0.5" style={{ lineHeight: 18 }}>
              {item.mediaCount} mục · {formatBytes(item.totalSize, 0)}
            </Text>
          </View>
        )}
      </PressableScale>
    </FadeInView>
  );
};

const SharedWithMeCard = ({
  folder,
  onPress,
}: {
  folder: Folder;
  onPress: () => void;
}) => {
  const color = folder.color || COLORS.primary;
  const iconName = (folder.iconName as any) || 'folder';
  const hasCover = !!folder.coverUrl;

  return (
    <PressableScale onPress={onPress} scaleTo={0.96} style={{ width: 180 }}>
      {hasCover ? (
        <ImageBackground
          source={{ uri: folder.coverUrl }}
          style={{ height: 140, justifyContent: 'flex-end', overflow: 'hidden' }}
          imageStyle={{ borderRadius: 20 }}
        >
          <View
            style={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
            }}
          >
            <Text
              style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}
              numberOfLines={1}
            >
              {folder.name}
            </Text>
            <Text
              style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}
              numberOfLines={1}
            >
              @{folder.ownerDisplayName || 'user'} · {folder.mediaCount} mục
            </Text>
          </View>
        </ImageBackground>
      ) : (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 14,
            height: 140,
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{ backgroundColor: color }}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <Ionicons name={iconName} size={18} color="#fff" />
          </View>
          <View>
            <Text
              className="text-text font-semibold text-[14px]"
              style={{ lineHeight: 18 }}
              numberOfLines={1}
            >
              {folder.name}
            </Text>
            <Text className="text-textSecondary text-[12px] mt-0.5" numberOfLines={1}>
              @{folder.ownerDisplayName || 'user'}
            </Text>
          </View>
        </View>
      )}
    </PressableScale>
  );
};
