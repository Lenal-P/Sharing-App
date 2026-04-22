import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

const ALBUM_NAME = 'Sharing';

const sanitizeFileName = (name: string): string => {
  // Giữ chữ/số/dấu chấm/gạch ngang, thay phần còn lại bằng _
  return name.replace(/[^\w.\-]/g, '_').slice(0, 120) || `file_${Date.now()}`;
};

/**
 * Tải 1 file từ URL về thư viện ảnh/video của máy.
 * - Hỏi permission MEDIA_LIBRARY_WRITE nếu chưa có
 * - Download vào cache, rồi `createAssetAsync` vào thư viện hệ thống
 * - Gom vào album "Sharing" (nếu device cho phép)
 */
export const downloadToGallery = async (
  url: string,
  fileName: string,
  onProgress?: (pct: number) => void
): Promise<void> => {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (perm.status !== 'granted') {
    throw new Error('Cần quyền truy cập thư viện ảnh để lưu file');
  }

  const safeName = sanitizeFileName(fileName);
  const cacheUri = `${FileSystem.cacheDirectory}${Date.now()}_${safeName}`;

  const resumable = FileSystem.createDownloadResumable(
    url,
    cacheUri,
    {},
    (progress) => {
      if (progress.totalBytesExpectedToWrite > 0) {
        onProgress?.((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100);
      }
    }
  );

  const result = await resumable.downloadAsync();
  if (!result?.uri) {
    throw new Error('Tải file thất bại');
  }

  const asset = await MediaLibrary.createAssetAsync(result.uri);

  // Gom vào album riêng — không critical nếu fail (Android vài version cấm).
  try {
    const existing = await MediaLibrary.getAlbumAsync(ALBUM_NAME);
    if (existing) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], existing, false);
    } else {
      await MediaLibrary.createAlbumAsync(ALBUM_NAME, asset, false);
    }
  } catch (e) {
    console.warn('Không tạo được album "Sharing":', e);
  }
};
