import { MediaType } from '../config/types';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Không có byte nào được chuyển trong 60s → coi như treo và huỷ upload.
const STALL_TIMEOUT_MS = 60000;

const guessMimeType = (fileName: string, mediaType: MediaType): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (mediaType === 'video') {
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'webm') return 'video/webm';
    return 'video/mp4';
  }
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
};

export const StorageService = {
  /**
   * Upload 1 file ảnh hoặc video lên Cloudinary (unsigned preset).
   * Trả về `secure_url` (full resolution, không nén phía Cloudinary).
   */
  uploadFile(
    uri: string,
    path: string,
    fileName: string,
    onProgress?: (progress: number) => void,
    mediaType: MediaType = 'image'
  ): Promise<string> {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      return Promise.reject(
        new Error(
          'Cloudinary chưa cấu hình. Thiếu EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME hoặc EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET trong .env'
        )
      );
    }

    const resourceType = mediaType === 'video' ? 'video' : 'image';
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('upload_preset', UPLOAD_PRESET);
      form.append('folder', `sharing-app/${path}`);
      form.append('file', {
        uri,
        name: fileName,
        type: guessMimeType(fileName, mediaType),
      } as any);

      const xhr = new XMLHttpRequest();
      let stallTimer: ReturnType<typeof setTimeout> | null = null;
      const resetStall = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          try {
            xhr.abort();
          } catch {}
          reject(new Error('Upload bị treo — kiểm tra mạng hoặc cấu hình Cloudinary'));
        }, STALL_TIMEOUT_MS);
      };

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress?.((e.loaded / e.total) * 100);
          resetStall();
        }
      };

      xhr.onerror = () => {
        if (stallTimer) clearTimeout(stallTimer);
        reject(new Error('Lỗi mạng khi upload lên Cloudinary'));
      };

      xhr.onabort = () => {
        if (stallTimer) clearTimeout(stallTimer);
      };

      xhr.onload = () => {
        if (stallTimer) clearTimeout(stallTimer);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data?.secure_url) {
              resolve(data.secure_url);
            } else {
              reject(new Error('Cloudinary không trả về secure_url'));
            }
          } catch {
            reject(new Error('Response Cloudinary không đọc được'));
          }
        } else {
          let msg = `Cloudinary HTTP ${xhr.status}`;
          try {
            const err = JSON.parse(xhr.responseText);
            msg = err?.error?.message || msg;
          } catch {}
          reject(new Error(msg));
        }
      };

      xhr.open('POST', endpoint);
      resetStall();
      xhr.send(form);
    });
  },
};
