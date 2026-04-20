import { Image, Video } from 'react-native-compressor';
import { MEDIA_QUALITY } from '../config/constants';

export const compressImage = async (uri: string): Promise<string> => {
  try {
    const result = await Image.compress(uri, {
      compressionMethod: 'auto',
      quality: MEDIA_QUALITY.IMAGE_QUALITY,
      returnableOutputType: 'uri',
    });
    return result;
  } catch (error) {
    console.error('Lỗi nén ảnh:', error);
    return uri; // Trả về uri gốc nếu lỗi
  }
};

export const compressVideo = async (
  uri: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    const result = await Video.compress(
      uri,
      {
        compressionMethod: 'auto',
        minimumFileSizeForCompress: 2, // Chỉ nén nếu > 2MB
      },
      (progress) => {
        if (onProgress) {
          onProgress(progress);
        }
      }
    );
    return result;
  } catch (error) {
    console.error('Lỗi nén video:', error);
    return uri;
  }
};
