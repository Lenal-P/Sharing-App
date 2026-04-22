import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Folder, MediaItem } from '../config/types';

const stripUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const out: Record<string, any> = {};
  Object.keys(obj).forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out as Partial<T>;
};

// Firebase SDK retries offline/denied writes indefinitely; race every network
// call with a deadline so the UI fails fast instead of spinning forever.
const FIREBASE_TIMEOUT_MS = 15000;

const withTimeout = <T>(promise: Promise<T>, ms = FIREBASE_TIMEOUT_MS, label = 'Firebase'): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} quá hạn sau ${Math.round(ms / 1000)}s — kiểm tra mạng hoặc cấu hình Firestore/Storage`)),
        ms
      )
    ),
  ]);

// Upload qua Cloudinary unsigned preset — không xoá được file vật lý từ
// client (yêu cầu API secret phía server). Khi user xoá media/folder,
// service này chỉ xoá metadata Firestore. File trên Cloudinary orphan
// nhưng không ảnh hưởng UX, có thể dọn thủ công qua Admin API sau.

const SHARE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SHARE_CODE_LEN = 6;

const generateShareCode = () => {
  let code = '';
  for (let i = 0; i < SHARE_CODE_LEN; i++) {
    code += SHARE_CODE_ALPHABET[Math.floor(Math.random() * SHARE_CODE_ALPHABET.length)];
  }
  return code;
};

export const FirestoreService = {
  // --- Folders ---
  async createFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'shareCode'>): Promise<Folder> {
    const folderRef = doc(collection(db, 'folders'));
    const now = new Date();

    const newFolder: Folder = {
      ...folder,
      id: folderRef.id,
      shareCode: folder.isPublic ? generateShareCode() : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await withTimeout(
      setDoc(folderRef, stripUndefined({
        ...newFolder,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })),
      FIREBASE_TIMEOUT_MS,
      'Tạo thư mục'
    );

    const userRef = doc(db, 'users', folder.ownerId);
    await withTimeout(
      updateDoc(userRef, { folderCount: increment(1) }),
      FIREBASE_TIMEOUT_MS,
      'Cập nhật user'
    );

    return newFolder;
  },

  async updateFolder(folderId: string, patch: Partial<Omit<Folder, 'id' | 'ownerId' | 'createdAt'>>): Promise<void> {
    const folderRef = doc(db, 'folders', folderId);
    await withTimeout(
      updateDoc(folderRef, {
        ...stripUndefined(patch),
        updatedAt: new Date().toISOString(),
      }),
      FIREBASE_TIMEOUT_MS,
      'Sửa thư mục'
    );
  },

  async getFoldersByUser(userId: string): Promise<Folder[]> {
    const foldersRef = collection(db, 'folders');
    // where + orderBy đòi composite index. Lấy rồi sort client-side để tránh
    // phải tạo index cho mỗi project (folders/user thường <100).
    const q = query(foldersRef, where('ownerId', '==', userId));

    const snapshot = await withTimeout(getDocs(q), FIREBASE_TIMEOUT_MS, 'Tải thư mục');
    const list = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      } as Folder;
    });
    return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  async toggleFolderShare(folderId: string, makePublic: boolean): Promise<{ isPublic: boolean; shareCode?: string }> {
    const folderRef = doc(db, 'folders', folderId);
    if (makePublic) {
      const shareCode = generateShareCode();
      await updateDoc(folderRef, {
        isPublic: true,
        shareCode,
        updatedAt: new Date().toISOString(),
      });
      return { isPublic: true, shareCode };
    }
    await updateDoc(folderRef, {
      isPublic: false,
      shareCode: null,
      updatedAt: new Date().toISOString(),
    });
    return { isPublic: false };
  },

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    const mediaRef = collection(db, `folders/${folderId}/mediaItems`);
    const snapshot = await withTimeout(getDocs(mediaRef), FIREBASE_TIMEOUT_MS, 'Tải media để xoá');

    let freedBytes = 0;
    const batch = writeBatch(db);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as MediaItem;
      freedBytes += data.fileSize || 0;
      batch.delete(docSnap.ref);
    }
    batch.delete(doc(db, 'folders', folderId));
    await withTimeout(batch.commit(), FIREBASE_TIMEOUT_MS, 'Xoá thư mục');

    const userRef = doc(db, 'users', userId);
    await withTimeout(
      updateDoc(userRef, {
        folderCount: increment(-1),
        storageUsed: increment(-freedBytes),
      }),
      FIREBASE_TIMEOUT_MS,
      'Cập nhật user'
    );
  },

  async deleteMediaItem(item: MediaItem, userId: string): Promise<void> {
    const itemRef = doc(db, `folders/${item.folderId}/mediaItems/${item.id}`);
    await withTimeout(deleteDoc(itemRef), FIREBASE_TIMEOUT_MS, 'Xoá media');

    const folderRef = doc(db, 'folders', item.folderId);
    await withTimeout(
      updateDoc(folderRef, {
        mediaCount: increment(-1),
        totalSize: increment(-(item.fileSize || 0)),
        updatedAt: new Date().toISOString(),
      }),
      FIREBASE_TIMEOUT_MS,
      'Cập nhật thư mục'
    );

    const userRef = doc(db, 'users', userId);
    await withTimeout(
      updateDoc(userRef, { storageUsed: increment(-(item.fileSize || 0)) }),
      FIREBASE_TIMEOUT_MS,
      'Cập nhật user'
    );
  },

  async incrementUserStorage(userId: string, deltaBytes: number): Promise<void> {
    if (!deltaBytes) return;
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { storageUsed: increment(deltaBytes) });
  },

  async updateUserProfile(userId: string, patch: { displayName?: string; photoURL?: string }): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, stripUndefined(patch));
  },

  // --- Media Items ---
  async addMediaItem(item: Omit<MediaItem, 'id' | 'createdAt'>): Promise<MediaItem> {
    const itemRef = doc(collection(db, `folders/${item.folderId}/mediaItems`));
    const now = new Date();

    const newItem: MediaItem = {
      ...item,
      id: itemRef.id,
      createdAt: now,
    };

    await withTimeout(
      setDoc(itemRef, stripUndefined({ ...newItem, createdAt: now.toISOString() })),
      FIREBASE_TIMEOUT_MS,
      'Lưu media'
    );

    const folderRef = doc(db, 'folders', item.folderId);
    await withTimeout(
      updateDoc(folderRef, {
        mediaCount: increment(1),
        totalSize: increment(item.fileSize),
        updatedAt: now.toISOString(),
      }),
      FIREBASE_TIMEOUT_MS,
      'Cập nhật thư mục'
    );

    return newItem;
  },

  async getMediaItemsByFolder(folderId: string): Promise<MediaItem[]> {
    const mediaRef = collection(db, `folders/${folderId}/mediaItems`);

    const snapshot = await withTimeout(getDocs(mediaRef), FIREBASE_TIMEOUT_MS, 'Tải media');
    const list = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { ...data, createdAt: new Date(data.createdAt) } as MediaItem;
    });
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getFolderByShareCode(code: string): Promise<Folder | null> {
    const foldersRef = collection(db, 'folders');
    const q = query(foldersRef, where('shareCode', '==', code), where('isPublic', '==', true));
    const snapshot = await withTimeout(getDocs(q), FIREBASE_TIMEOUT_MS, 'Tìm thư mục');
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    } as Folder;
  },
};
