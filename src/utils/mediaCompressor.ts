import * as ImageManipulator from 'expo-image-manipulator';
import { MEDIA_QUALITY } from '../config/constants';

export const compressImage = async (uri: string): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }],
      {
        compress: MEDIA_QUALITY.IMAGE_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (error) {
    console.warn('Không nén được ảnh, dùng bản gốc:', error);
    return uri;
  }
};

// expo-av không có API nén video; react-native-compressor cần dev build.
// Trong Expo Go: upload trực tiếp file gốc. Khi eject/EAS build thì thay bằng
// react-native-compressor để tiết kiệm dung lượng.
export const compressVideo = async (
  uri: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  onProgress?.(1);
  return uri;
};
