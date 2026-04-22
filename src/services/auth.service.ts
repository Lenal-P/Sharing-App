import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  deleteUser,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile } from '../config/types';

const ensureProfileDoc = async (user: User, displayName?: string): Promise<UserProfile> => {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const data = snap.data();
    return { ...data, createdAt: new Date(data.createdAt) } as UserProfile;
  }
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: displayName ?? user.displayName ?? user.email?.split('@')[0] ?? 'User',
    storageUsed: 0,
    folderCount: 0,
    createdAt: new Date(),
  };
  await setDoc(userRef, { ...profile, createdAt: profile.createdAt.toISOString() });
  return profile;
};

export const AuthService = {
  async register(email: string, password: string, displayName: string): Promise<UserProfile> {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    try {
      await updateProfile(user, { displayName });
      return await ensureProfileDoc(user, displayName);
    } catch (error) {
      // Firestore ghi thất bại → rollback auth user để email có thể đăng ký lại
      try {
        await deleteUser(user);
      } catch (rollbackErr) {
        console.warn('Không rollback được auth user:', rollbackErr);
      }
      throw error;
    }
  },

  async login(email: string, password: string): Promise<UserProfile> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return ensureProfileDoc(credential.user);
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return null;
      const data = snap.data();
      return { ...data, createdAt: new Date(data.createdAt) } as UserProfile;
    } catch (error) {
      console.error('Lỗi khi lấy thông tin người dùng:', error);
      return null;
    }
  },

  async ensureProfileForUser(user: User): Promise<UserProfile | null> {
    try {
      return await ensureProfileDoc(user);
    } catch (error) {
      console.error('Không tạo được profile:', error);
      return null;
    }
  },

  async updateDisplayName(uid: string, displayName: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), { displayName });
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName });
    }
  },
};
