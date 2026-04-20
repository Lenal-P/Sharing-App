import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export const StorageService = {
  uploadFile(
    uri: string,
    path: string,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Expo lấy file từ local URI
        const response = await fetch(uri);
        const blob = await response.blob();

        const fileRef = ref(storage, `${path}/${Date.now()}_${fileName}`);
        const uploadTask = uploadBytesResumable(fileRef, blob);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
              onProgress(progress);
            }
          },
          (error) => {
            console.error('Lỗi upload file:', error);
            reject(error);
          },
          async () => {
            // Lấy Download URL khi upload xong
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      } catch (error) {
        console.error('Lỗi khi chuẩn bị upload:', error);
        reject(error);
      }
    });
  },
};
