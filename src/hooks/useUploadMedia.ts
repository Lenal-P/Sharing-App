import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useFolderStore } from '../store/folderStore';
import { StorageService } from '../services/storage.service';
import { FirestoreService } from '../services/firestore.service';
import { useAuthStore } from '../store/authStore';
import { compressImage, compressVideo } from '../utils/mediaCompressor';
import { UploadProgress } from '../config/types';

export const useUploadMedia = () => {
  const { user, setUser } = useAuthStore();
  const { addMediaItem, updateFolder, updateUploadProgress, setUploadProgress, clearUploadProgress } = useFolderStore();
  const [isUploading, setIsUploading] = useState(false);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraStatus === 'granted' && libraryStatus === 'granted';
  }, []);

  const pickFromLibrary = useCallback(async (allowsMultipleSelection = true) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection,
      quality: 1,
      allowsEditing: !allowsMultipleSelection,
    });

    if (result.canceled) return null;
    return result.assets;
  }, [requestPermissions]);

  const pickFromCamera = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 1,
    });

    if (result.canceled) return null;
    return result.assets;
  }, [requestPermissions]);

  const uploadAssets = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[], folderId: string) => {
      if (!user) return;
      setIsUploading(true);

      const initialProgress: UploadProgress[] = assets.map((a) => ({
        fileName: a.fileName || 'file',
        progress: 0,
        status: 'compressing',
      }));
      setUploadProgress(initialProgress);

      let totalUploadedBytes = 0;
      let totalItems = 0;

      for (const asset of assets) {
        const fileName = asset.fileName || `media_${Date.now()}`;
        const isVideo = asset.type === 'video';

        try {
          updateUploadProgress(fileName, { status: 'compressing', progress: 0 });
          const compressedUri = isVideo
            ? await compressVideo(asset.uri, (p) =>
                updateUploadProgress(fileName, { progress: p * 0.5 })
              )
            : await compressImage(asset.uri);

          updateUploadProgress(fileName, { status: 'uploading', progress: 50 });
          const storagePath = `${user.uid}/${folderId}`;
          const downloadURL = await StorageService.uploadFile(
            compressedUri,
            storagePath,
            fileName,
            (p) => updateUploadProgress(fileName, { progress: 50 + p * 0.5 }),
            isVideo ? 'video' : 'image'
          );

          const newItem = await FirestoreService.addMediaItem({
            folderId,
            ownerId: user.uid,
            type: isVideo ? 'video' : 'image',
            url: downloadURL,
            fileName,
            fileSize: asset.fileSize || 0,
            width: asset.width,
            height: asset.height,
            duration: asset.duration ?? undefined,
          });
          addMediaItem(newItem);
          totalUploadedBytes += newItem.fileSize || 0;
          totalItems += 1;
          updateUploadProgress(fileName, { status: 'done', progress: 100 });
        } catch (error) {
          console.error('Lỗi upload:', error);
          updateUploadProgress(fileName, { status: 'error', progress: 0 });
        }
      }

      if (totalItems > 0) {
        const current = useFolderStore.getState().folders.find((f) => f.id === folderId);
        if (current) {
          const updates: Record<string, any> = {
            mediaCount: (current.mediaCount || 0) + totalItems,
            totalSize: (current.totalSize || 0) + totalUploadedBytes,
          };
          // Folder chưa có cover → dùng URL ảnh đầu tiên làm thumbnail
          if (!current.coverUrl) {
            const firstImageItem = useFolderStore
              .getState()
              .mediaItems.find((m) => m.folderId === folderId && m.type === 'image');
            if (firstImageItem?.url) {
              updates.coverUrl = firstImageItem.url;
              try {
                await FirestoreService.updateFolder(folderId, { coverUrl: firstImageItem.url });
              } catch (e) {
                console.warn('Không set được coverUrl:', e);
              }
            }
          }
          updateFolder(folderId, updates);
        }
        try {
          await FirestoreService.incrementUserStorage(user.uid, totalUploadedBytes);
          setUser({
            ...user,
            storageUsed: (user.storageUsed || 0) + totalUploadedBytes,
          });
        } catch (e) {
          console.warn('Không cập nhật được storage của user:', e);
        }
      }

      setIsUploading(false);
      setTimeout(() => clearUploadProgress(), 3000);
    },
    [user, setUser, addMediaItem, updateFolder, updateUploadProgress, setUploadProgress, clearUploadProgress]
  );

  return {
    isUploading,
    pickFromLibrary,
    pickFromCamera,
    uploadAssets,
  };
};
