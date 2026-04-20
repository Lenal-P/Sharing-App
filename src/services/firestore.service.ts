import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  updateDoc,
  getDoc,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Folder, MediaItem } from '../config/types';

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

    await setDoc(folderRef, {
      ...newFolder,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    // Cập nhật số lượng thư mục của user
    const userRef = doc(db, 'users', folder.ownerId);
    await updateDoc(userRef, {
      folderCount: increment(1)
    });

    return newFolder;
  },

  async getFoldersByUser(userId: string): Promise<Folder[]> {
    const foldersRef = collection(db, 'folders');
    const q = query(foldersRef, where('ownerId', '==', userId), orderBy('updatedAt', 'desc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      } as Folder;
    });
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
    await deleteDoc(doc(db, 'folders', folderId));
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      folderCount: increment(-1)
    });
    // Trong thực tế, cần xóa cẩn thận:
    // 1. Lấy tất cả media của thư mục này
    // 2. Xóa các file vật lý trên Storage
    // 3. Xóa các document MediaItem trên Firestore
    // Cần Firebase Cloud Functions để đảm bảo an toàn & không rò rỉ bộ nhớ
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

    await setDoc(itemRef, {
      ...newItem,
      createdAt: now.toISOString(),
    });

    // Cập nhật thống kê thư mục
    const folderRef = doc(db, 'folders', item.folderId);
    await updateDoc(folderRef, {
      mediaCount: increment(1),
      totalSize: increment(item.fileSize),
      updatedAt: now.toISOString(),
    });

    return newItem;
  },

  async getMediaItemsByFolder(folderId: string): Promise<MediaItem[]> {
    const mediaRef = collection(db, `folders/${folderId}/mediaItems`);
    const q = query(mediaRef, orderBy('createdAt', 'desc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
      } as MediaItem;
    });
  },

  async getFolderByShareCode(code: string): Promise<Folder | null> {
    const foldersRef = collection(db, 'folders');
    const q = query(foldersRef, where('shareCode', '==', code), where('isPublic', '==', true));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    } as Folder;
  },
};
