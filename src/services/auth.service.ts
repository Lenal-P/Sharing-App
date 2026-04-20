import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile } from '../config/types';

export const AuthService = {
  async register(email: string, password: string, displayName: string): Promise<UserProfile> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName });

      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName,
        storageUsed: 0,
        folderCount: 0,
        createdAt: new Date(),
      };

      // Lưu thông tin user vào Firestore
      await setDoc(doc(db, 'users', user.uid), {
        ...userProfile,
        createdAt: new Date().toISOString(),
      });

      return userProfile;
    } catch (error) {
      console.error('Lỗi khi đăng ký:', error);
      throw error;
    }
  },

  async login(email: string, password: string): Promise<UserProfile> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          ...data,
          createdAt: new Date(data.createdAt),
        } as UserProfile;
      } else {
        throw new Error('Dữ liệu người dùng không tồn tại');
      }
    } catch (error) {
      console.error('Lỗi khi đăng nhập:', error);
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
      throw error;
    }
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          ...data,
          createdAt: new Date(data.createdAt),
        } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Lỗi khi lấy thông tin người dùng:', error);
      return null;
    }
  }
};
