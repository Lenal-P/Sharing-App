import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/constants';
import { useFolderStore } from '../../store/folderStore';
import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { FirestoreService } from '../../services/firestore.service';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList, Folder } from '../../config/types';
import { formatBytes } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'FolderList'>;

export const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const { folders, setFolders, deleteFolder, isLoadingFolders, setLoadingFolders } = useFolderStore();

  const loadFolders = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingFolders(true);
      const userFolders = await FirestoreService.getFoldersByUser(user.uid);
      setFolders(userFolders);
    } catch (error) {
      console.error('Lỗi tải thư mục:', error);
    } finally {
      setLoadingFolders(false);
    }
  }, [user]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleLongPress = (folder: Folder) => {
    Alert.alert(folder.name, 'Chọn hành động', [
      {
        text: 'Sửa',
        onPress: () =>
          navigation.navigate('CreateFolder', { mode: 'edit', folderId: folder.id }),
      },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => confirmDelete(folder),
      },
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

  const renderFolder = ({ item }: { item: Folder }) => {
    const color = item.color || COLORS.primary;
    const iconName = (item.iconName as any) || 'folder';
    return (
      <TouchableOpacity
        className="bg-card w-[48%] rounded-2xl p-4 mb-4"
        onPress={() => navigation.navigate('FolderDetail', { folderId: item.id })}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.75}
      >
        <View
          style={{ backgroundColor: color + '33' }}
          className="w-12 h-12 rounded-full items-center justify-center mb-3"
        >
          <Ionicons name={iconName} size={24} color={color} />
        </View>
        <Text className="text-white font-semibold text-base mb-1" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-textSecondary text-xs mb-0.5">{item.mediaCount} mục</Text>
        <Text className="text-textMuted text-xs">{formatBytes(item.totalSize)}</Text>
        {item.isPublic && (
          <View className="flex-row items-center mt-2">
            <Ionicons name="earth-outline" size={11} color={COLORS.accent} />
            <Text className="text-accent text-xs ml-1">Công khai</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 py-4 flex-row justify-between items-center">
        <View>
          <Text className="text-textSecondary text-sm mb-0.5">Chào mừng quay lại 👋</Text>
          <Text className="text-white text-2xl font-bold">{user?.displayName || 'Người dùng'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateFolder')}
          className="bg-primary p-3 rounded-full"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View className="mx-5 mb-4 bg-card rounded-2xl flex-row">
        <View className="flex-1 items-center py-3 border-r border-border">
          <Text className="text-white text-xl font-bold">{folders.length}</Text>
          <Text className="text-textMuted text-xs mt-0.5">Thư mục</Text>
        </View>
        <View className="flex-1 items-center py-3 border-r border-border">
          <Text className="text-white text-xl font-bold">
            {folders.reduce((s, f) => s + f.mediaCount, 0)}
          </Text>
          <Text className="text-textMuted text-xs mt-0.5">Ảnh & Video</Text>
        </View>
        <View className="flex-1 items-center py-3">
          <Text className="text-white text-xl font-bold">
            {formatBytes(folders.reduce((s, f) => s + f.totalSize, 0), 0)}
          </Text>
          <Text className="text-textMuted text-xs mt-0.5">Đã dùng</Text>
        </View>
      </View>

      <View className="flex-1 px-5">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-lg font-bold">Thư mục của tôi</Text>
          <Text className="text-textMuted text-xs">Giữ lâu để sửa/xoá</Text>
        </View>

        {isLoadingFolders && folders.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : folders.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <View className="bg-surfaceAlt w-24 h-24 rounded-full items-center justify-center mb-4">
              <Ionicons name="folder-open-outline" size={44} color={COLORS.textMuted} />
            </View>
            <Text className="text-white text-lg font-bold mb-2">Chưa có thư mục</Text>
            <Text className="text-textSecondary text-sm text-center mb-6">
              Tạo thư mục đầu tiên để bắt đầu lưu trữ ảnh và video của bạn
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateFolder')}
              className="bg-primary px-8 py-3 rounded-xl"
            >
              <Text className="text-white font-bold">Tạo thư mục</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={folders}
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
            renderItem={renderFolder}
          />
        )}
      </View>
    </SafeAreaView>
  );
};
