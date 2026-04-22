import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  deleteDoc,
  updateDoc,
  increment,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import * as Crypto from 'expo-crypto';
import { db } from '../config/firebase';
import { Folder, MediaItem, UserProfile, Comment } from '../config/types';

const hashPassword = async (password: string): Promise<string> => {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
};

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
  async createFolder(
    folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'shareCode' | 'passwordHash'>,
    password?: string
  ): Promise<Folder> {
    const folderRef = doc(collection(db, 'folders'));
    const now = new Date();

    // Luôn sinh shareCode để có thể join bất kể public hay private
    const passwordHash = password ? await hashPassword(password) : undefined;

    const newFolder: Folder = {
      ...folder,
      id: folderRef.id,
      shareCode: generateShareCode(),
      passwordHash,
      members: folder.members ?? [],
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

  /** Lấy profile theo danh sách uid — cho Members modal */
  async getUsersByIds(uids: string[]): Promise<UserProfile[]> {
    if (uids.length === 0) return [];
    // Firestore where-in giới hạn 30 uid/batch → chunk
    const chunks: string[][] = [];
    for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));
    const all: UserProfile[] = [];
    for (const chunk of chunks) {
      const q = query(collection(db, 'users'), where('uid', 'in', chunk));
      const snap = await withTimeout(getDocs(q), FIREBASE_TIMEOUT_MS, 'Tải thành viên');
      for (const d of snap.docs) {
        const data = d.data();
        all.push({ ...data, createdAt: new Date(data.createdAt) } as UserProfile);
      }
    }
    return all.sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));
  },

  /** Tất cả user trong app — cho invite picker. Exclude current user. */
  async getAllUsers(excludeUid?: string): Promise<UserProfile[]> {
    const usersRef = collection(db, 'users');
    const snapshot = await withTimeout(getDocs(usersRef), FIREBASE_TIMEOUT_MS, 'Tải danh sách user');
    return snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          ...data,
          createdAt: new Date(data.createdAt),
        } as UserProfile;
      })
      .filter((u) => (excludeUid ? u.uid !== excludeUid : true))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));
  },

  /** Folders mà user được mời vào (uid in members), loại folder mà user là owner. */
  async getSharedFoldersForUser(userId: string): Promise<Folder[]> {
    const foldersRef = collection(db, 'folders');
    const q = query(foldersRef, where('members', 'array-contains', userId));
    const snapshot = await withTimeout(getDocs(q), FIREBASE_TIMEOUT_MS, 'Tải thư mục được chia sẻ');
    return snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        } as Folder;
      })
      .filter((f) => f.ownerId !== userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  /** Add nhiều uids vào members cùng lúc */
  async addMembers(folderId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    const folderRef = doc(db, 'folders', folderId);
    await withTimeout(
      updateDoc(folderRef, {
        members: arrayUnion(...userIds),
        updatedAt: new Date().toISOString(),
      }),
      FIREBASE_TIMEOUT_MS,
      'Mời thành viên'
    );
  },

  /** Kick 1 member khỏi folder (owner mới gọi) */
  async removeMember(folderId: string, userId: string): Promise<void> {
    const folderRef = doc(db, 'folders', folderId);
    const snap = await getDoc(folderRef);
    const currentMembers = (snap.data()?.members as string[] | undefined) ?? [];
    await withTimeout(
      updateDoc(folderRef, {
        members: currentMembers.filter((m) => m !== userId),
        updatedAt: new Date().toISOString(),
      }),
      FIREBASE_TIMEOUT_MS,
      'Xoá thành viên'
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

  async toggleFolderShare(folderId: string, makePublic: boolean): Promise<{ isPublic: boolean; shareCode: string }> {
    const folderRef = doc(db, 'folders', folderId);
    const snap = await getDoc(folderRef);
    const existingCode = (snap.data()?.shareCode as string | undefined) ?? generateShareCode();
    // ShareCode giữ nguyên trong mọi trường hợp — chỉ đổi isPublic
    await updateDoc(folderRef, {
      isPublic: makePublic,
      shareCode: existingCode,
      updatedAt: new Date().toISOString(),
    });
    return { isPublic: makePublic, shareCode: existingCode };
  },

  /** Kiểm tra password của folder private. Trả true nếu khớp (hoặc folder không có password). */
  async verifyFolderPassword(folderId: string, password: string): Promise<boolean> {
    const snap = await getDoc(doc(db, 'folders', folderId));
    if (!snap.exists()) return false;
    const data = snap.data();
    if (!data.passwordHash) return true;
    const inputHash = await hashPassword(password);
    return inputHash === data.passwordHash;
  },

  /** Add user vào members[] của folder (sau khi verify password hoặc folder public). */
  async joinFolder(folderId: string, userId: string): Promise<void> {
    const folderRef = doc(db, 'folders', folderId);
    await withTimeout(
      updateDoc(folderRef, {
        members: arrayUnion(userId),
        updatedAt: new Date().toISOString(),
      }),
      FIREBASE_TIMEOUT_MS,
      'Join thư mục'
    );
  },

  async getFolderById(folderId: string): Promise<Folder | null> {
    const snap = await getDoc(doc(db, 'folders', folderId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    } as Folder;
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

  // --- Comments ---
  async getComments(folderId: string, itemId: string): Promise<Comment[]> {
    const ref = collection(db, `folders/${folderId}/mediaItems/${itemId}/comments`);
    const snap = await withTimeout(getDocs(ref), FIREBASE_TIMEOUT_MS, 'Tải bình luận');
    return snap.docs
      .map((d) => {
        const data = d.data();
        return { ...data, createdAt: new Date(data.createdAt) } as Comment;
      })
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },

  async addComment(
    folderId: string,
    itemId: string,
    author: { uid: string; displayName: string; photoURL?: string },
    text: string
  ): Promise<Comment> {
    const ref = doc(collection(db, `folders/${folderId}/mediaItems/${itemId}/comments`));
    const now = new Date();
    const comment: Comment = {
      id: ref.id,
      folderId,
      itemId,
      authorId: author.uid,
      authorName: author.displayName,
      authorPhotoURL: author.photoURL,
      text,
      createdAt: now,
    };
    await withTimeout(
      setDoc(ref, stripUndefined({ ...comment, createdAt: now.toISOString() })),
      FIREBASE_TIMEOUT_MS,
      'Đăng bình luận'
    );
    return comment;
  },

  async deleteComment(folderId: string, itemId: string, commentId: string): Promise<void> {
    await withTimeout(
      deleteDoc(doc(db, `folders/${folderId}/mediaItems/${itemId}/comments/${commentId}`)),
      FIREBASE_TIMEOUT_MS,
      'Xoá bình luận'
    );
  },

  async updateMediaItem(
    folderId: string,
    itemId: string,
    patch: Partial<Omit<MediaItem, 'id' | 'folderId' | 'ownerId' | 'createdAt'>>
  ): Promise<void> {
    const itemRef = doc(db, `folders/${folderId}/mediaItems/${itemId}`);
    await withTimeout(
      updateDoc(itemRef, stripUndefined(patch)),
      FIREBASE_TIMEOUT_MS,
      'Sửa media'
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

  async getPublicFolders(excludeOwnerId?: string, limitCount = 50): Promise<Folder[]> {
    const foldersRef = collection(db, 'folders');
    const q = query(foldersRef, where('isPublic', '==', true));
    const snapshot = await withTimeout(getDocs(q), FIREBASE_TIMEOUT_MS, 'Tải thư mục công khai');
    const list = snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        } as Folder;
      })
      .filter((f) => (excludeOwnerId ? f.ownerId !== excludeOwnerId : true));
    return list
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limitCount);
  },

  async getFolderByShareCode(code: string): Promise<Folder | null> {
    const foldersRef = collection(db, 'folders');
    // Tìm theo shareCode bất kể public/private — private sẽ cần password ở UI
    const q = query(foldersRef, where('shareCode', '==', code));
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
