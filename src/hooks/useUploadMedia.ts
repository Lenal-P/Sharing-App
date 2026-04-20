import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useFolderStore } from '../store/folderStore';
import { StorageService } from '../services/storage.service';
import { FirestoreService } from '../services/firestore.service';
import { useAuthStore } from '../store/authStore';
import { compressImage, compressVideo } from '../utils/mediaCompressor';
import { UploadProgress } from '../config/types';

export const useUploadMedia = () => {
  const { user } = useAuthStore();
  const { currentFolder, addMediaItem, updateUploadProgress, setUploadProgress, clearUploadProgress } = useFolderStore();
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

      for (const asset of assets) {
        const fileName = asset.fileName || `media_${Date.now()}`;
        const isVideo = asset.type === 'video';

        try {
          // 1. Nén file
          updateUploadProgress(fileName, { status: 'compressing', progress: 0 });
          const compressedUri = isVideo
            ? await compressVideo(asset.uri, (p) =>
                updateUploadProgress(fileName, { progress: p * 0.5 })
              )
            : await compressImage(asset.uri);

          // 2. Upload lên Storage
          updateUploadProgress(fileName, { status: 'uploading', progress: 50 });
          const storagePath = `users/${user.uid}/folders/${folderId}`;
          const downloadURL = await StorageService.uploadFile(
            compressedUri,
            storagePath,
            fileName,
            (p) => updateUploadProgress(fileName, { progress: 50 + p * 0.5 })
          );

          // 3. Lưu metadata vào Firestore
          const newItem = await FirestoreService.addMediaItem({
            id: '',
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
        } catch (error) {
          console.error('Lỗi upload:', error);
          updateUploadProgress(fileName, { status: 'error', progress: 0 });
        }
      }

      setIsUploading(false);
      setTimeout(() => clearUploadProgress(), 3000);
    },
    [user, addMediaItem, updateUploadProgress, setUploadProgress, clearUploadProgress]
  );

  return {
    isUploading,
    pickFromLibrary,
    pickFromCamera,
    uploadAssets,
  };
};
