import { GoogleTokenStore } from './google-auth.service';
import { MediaType } from '../config/types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const APP_FOLDER_NAME = 'Sharing App';

const mimeFromFileName = (fileName: string, mediaType: MediaType): string => {
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

const authHeader = async (): Promise<Record<string, string>> => {
  const token = await GoogleTokenStore.getValidAccessToken();
  if (!token) {
    throw new Error('GOOGLE_TOKEN_EXPIRED');
  }
  return { Authorization: `Bearer ${token}` };
};

export interface DriveUploadResult {
  fileId: string;
  /** URL xem công khai — chỉ hoạt động sau khi makePublic */
  publicUrl: string;
  /** Thumbnail URL (qua Google CDN) */
  thumbnailUrl: string;
}

export const DriveService = {
  /** Tạo folder "Sharing App" ở root Drive, trả id. Nếu đã tồn tại, trả id cũ. */
  async ensureAppFolder(): Promise<string> {
    const headers = await authHeader();
    // Search folder đã tồn tại
    const q = encodeURIComponent(
      `name = '${APP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const searchRes = await fetch(`${DRIVE_API}/files?q=${q}&fields=files(id,name)`, {
      headers,
    });
    if (!searchRes.ok) {
      throw new Error(`Drive search lỗi: ${searchRes.status}`);
    }
    const searchData = await searchRes.json();
    if (searchData.files?.[0]?.id) return searchData.files[0].id;

    // Chưa có → tạo mới
    const createRes = await fetch(`${DRIVE_API}/files`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: APP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    if (!createRes.ok) {
      throw new Error(`Tạo folder Drive lỗi: ${createRes.status}`);
    }
    const created = await createRes.json();
    return created.id;
  },

  /**
   * Upload 1 file qua Drive resumable upload.
   * Emit progress qua XHR upload event.
   */
  uploadFile(
    uri: string,
    fileName: string,
    parentFolderId: string,
    mediaType: MediaType,
    onProgress?: (percent: number) => void
  ): Promise<DriveUploadResult> {
    return new Promise(async (resolve, reject) => {
      try {
        const headers = await authHeader();
        const mimeType = mimeFromFileName(fileName, mediaType);

        // 1. Khởi tạo resumable session
        const initRes = await fetch(
          `${UPLOAD_API}/files?uploadType=resumable&fields=id,name,size`,
          {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json; charset=UTF-8',
              'X-Upload-Content-Type': mimeType,
            },
            body: JSON.stringify({
              name: fileName,
              parents: [parentFolderId],
              mimeType,
            }),
          }
        );

        if (!initRes.ok) {
          const txt = await initRes.text();
          throw new Error(`Drive init upload lỗi (${initRes.status}): ${txt.slice(0, 200)}`);
        }

        const uploadUrl = initRes.headers.get('Location');
        if (!uploadUrl) {
          throw new Error('Drive không trả Upload URL');
        }

        // 2. Upload bytes qua XHR để có progress
        const fileResp = await fetch(uri);
        const blob = await fileResp.blob();

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', mimeType);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 100);
        };
        xhr.onerror = () => reject(new Error('Lỗi mạng khi upload lên Drive'));
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              const fileId: string = data.id;
              // Set permission public để xem được không cần auth
              try {
                await DriveService.makePublic(fileId);
              } catch (permErr) {
                console.warn('Set permission thất bại:', permErr);
              }
              resolve({
                fileId,
                publicUrl: DriveService.publicUrl(fileId),
                thumbnailUrl: DriveService.thumbnailUrl(fileId),
              });
            } catch (e: any) {
              reject(new Error(`Drive response parse lỗi: ${e.message}`));
            }
          } else {
            reject(new Error(`Drive upload lỗi HTTP ${xhr.status}: ${xhr.responseText.slice(0, 200)}`));
          }
        };
        xhr.send(blob);
      } catch (e) {
        reject(e);
      }
    });
  },

  /** Set file có thể xem công khai với ai có link. */
  async makePublic(fileId: string): Promise<void> {
    const headers = await authHeader();
    const res = await fetch(`${DRIVE_API}/files/${fileId}/permissions`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
    if (!res.ok && res.status !== 403) {
      // 403 có thể là đã public rồi — chấp nhận
      throw new Error(`Set permission lỗi: ${res.status}`);
    }
  },

  /** Xoá file trên Drive */
  async deleteFile(fileId: string): Promise<void> {
    const headers = await authHeader();
    const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Xoá Drive file lỗi: ${res.status}`);
    }
  },

  /** URL CDN của Google cho ảnh Drive public (width 2000). */
  publicUrl(fileId: string, size = 2000): string {
    return `https://lh3.googleusercontent.com/d/${fileId}=w${size}`;
  },

  /** Thumbnail nhỏ để hiển thị grid */
  thumbnailUrl(fileId: string, width = 600): string {
    return `https://lh3.googleusercontent.com/d/${fileId}=w${width}-h${width}`;
  },
};
