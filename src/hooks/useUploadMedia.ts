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
  const {
    addMediaItem,
    updateFolder,
    updateUploadProgress,
    setUploadProgress,
    clearUploadProgress,
  } = useFolderStore();
  const [isUploading, setIsUploading] = useState(false);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraStatus === 'granted' && libraryStatus === 'granted';
  }, []);

  const pickFromLibrary = useCallback(
    async (allowsMultipleSelection = true) => {
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
    },
    [requestPermissions]
  );

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

  /**
   * Upload 1 asset. Trả về { bytes } nếu thành công, null nếu fail.
   */
  const uploadOne = useCallback(
    async (
      asset: ImagePicker.ImagePickerAsset,
      folderId: string
    ): Promise<{ bytes: number } | null> => {
      if (!user) return null;
      const fileName = asset.fileName || `media_${Date.now()}`;
      const isVideo = asset.type === 'video';

      try {
        updateUploadProgress(fileName, {
          status: 'compressing',
          progress: 0,
          errorMessage: undefined,
        });
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
        updateUploadProgress(fileName, { status: 'done', progress: 100 });
        return { bytes: newItem.fileSize || 0 };
      } catch (error: any) {
        console.error('Lỗi upload:', error);
        // Lưu asset + folderId + message để retry
        updateUploadProgress(fileName, {
          status: 'error',
          progress: 0,
          asset,
          folderId,
          errorMessage: error?.message || 'Lỗi không xác định',
        });
        return null;
      }
    },
    [user, addMediaItem, updateUploadProgress]
  );

  const finalizeUpload = useCallback(
    async (folderId: string, addedItems: number, addedBytes: number) => {
      if (addedItems === 0 || !user) return;
      const current = useFolderStore.getState().folders.find((f) => f.id === folderId);
      if (current) {
        const updates: Record<string, any> = {
          mediaCount: (current.mediaCount || 0) + addedItems,
          totalSize: (current.totalSize || 0) + addedBytes,
        };
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
        await FirestoreService.incrementUserStorage(user.uid, addedBytes);
        setUser({
          ...user,
          storageUsed: (user.storageUsed || 0) + addedBytes,
        });
      } catch (e) {
        console.warn('Không cập nhật được storage của user:', e);
      }
    },
    [user, setUser, updateFolder]
  );

  const uploadAssets = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[], folderId: string) => {
      if (!user) return;
      setIsUploading(true);

      const initialProgress: UploadProgress[] = assets.map((a) => ({
        fileName: a.fileName || 'file',
        progress: 0,
        status: 'compressing',
        asset: a,
        folderId,
      }));
      setUploadProgress(initialProgress);

      let totalBytes = 0;
      let totalItems = 0;
      for (const asset of assets) {
        const result = await uploadOne(asset, folderId);
        if (result) {
          totalBytes += result.bytes;
          totalItems += 1;
        }
      }

      await finalizeUpload(folderId, totalItems, totalBytes);

      setIsUploading(false);
      // Chỉ auto-clear nếu không còn item lỗi — giữ error items để retry
      setTimeout(() => {
        const remaining = useFolderStore
          .getState()
          .uploadProgress.filter((p) => p.status === 'error');
        if (remaining.length === 0) clearUploadProgress();
      }, 3000);
    },
    [user, uploadOne, finalizeUpload, setUploadProgress, clearUploadProgress]
  );

  /** Retry 1 file đang ở status error */
  const retryUpload = useCallback(
    async (fileName: string) => {
      const item = useFolderStore.getState().uploadProgress.find((p) => p.fileName === fileName);
      if (!item?.asset || !item.folderId) return;
      setIsUploading(true);
      const result = await uploadOne(item.asset, item.folderId);
      if (result) {
        await finalizeUpload(item.folderId, 1, result.bytes);
      }
      setIsUploading(false);
    },
    [uploadOne, finalizeUpload]
  );

  /** Retry tất cả file lỗi */
  const retryAllFailed = useCallback(async () => {
    const failed = useFolderStore
      .getState()
      .uploadProgress.filter((p) => p.status === 'error' && p.asset && p.folderId);
    if (failed.length === 0) return;
    setIsUploading(true);
    const byFolder = new Map<string, { assets: any[]; }>();
    for (const p of failed) {
      const entry = byFolder.get(p.folderId!) ?? { assets: [] };
      entry.assets.push(p.asset);
      byFolder.set(p.folderId!, entry);
    }
    for (const [folderId, { assets }] of byFolder.entries()) {
      let bytes = 0;
      let items = 0;
      for (const a of assets) {
        const r = await uploadOne(a, folderId);
        if (r) {
          bytes += r.bytes;
          items += 1;
        }
      }
      await finalizeUpload(folderId, items, bytes);
    }
    setIsUploading(false);
  }, [uploadOne, finalizeUpload]);

  const dismissUploadProgress = useCallback(() => {
    clearUploadProgress();
  }, [clearUploadProgress]);

  return {
    isUploading,
    pickFromLibrary,
    pickFromCamera,
    uploadAssets,
    retryUpload,
    retryAllFailed,
    dismissUploadProgress,
  };
};
