// Types cho toàn bộ ứng dụng

export type MediaType = 'image' | 'video';

export interface MediaItem {
  id: string;
  folderId: string;
  ownerId: string;
  type: MediaType;
  url: string;
  /** Google Drive file ID — để xoá/set permission qua Drive API */
  fileId?: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: Date;
  caption?: string;
}

export interface Folder {
  id: string;
  ownerId: string;
  /** Denormalized tên user chủ thư mục — để filter/search feed công khai */
  ownerDisplayName?: string;
  name: string;
  description?: string;
  coverUrl?: string;
  iconName?: string;
  color?: string;
  mediaCount: number;
  totalSize: number;
  isPublic: boolean;
  sharedWith: string[];
  shareCode?: string;
  /** SHA-256 hash của password — chỉ bắt buộc với folder private có mật khẩu */
  passwordHash?: string;
  /** Danh sách uid đã join (có thể xem + upload). Owner không cần trong list. */
  members?: string[];
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  storageUsed: number;
  folderCount: number;
  createdAt: Date;
  /** ID folder "Sharing App" do app tạo ở Drive của user */
  driveAppFolderId?: string;
}

export interface ShareLink {
  id: string;
  folderId: string;
  code: string;
  createdBy: string;
  expiresAt?: Date;
  maxViews?: number;
  viewCount: number;
  isActive: boolean;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Upload: undefined;
  Shared: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  FolderList: undefined;
  FolderDetail: { folderId: string };
  MediaViewer: { mediaItems: MediaItem[]; startIndex: number; readOnly?: boolean };
  CreateFolder: { mode?: 'create' | 'edit'; folderId?: string } | undefined;
};

export type SharedStackParamList = {
  SharedHome: undefined;
  SharedFolder: { folderId: string; shareCode: string };
  SharedMediaViewer: { mediaItems: MediaItem[]; startIndex: number };
};

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'done' | 'error';
  /** Asset gốc để retry khi lỗi */
  asset?: any;
  folderId?: string;
  errorMessage?: string;
}

export interface Comment {
  id: string;
  folderId: string;
  itemId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  text: string;
  createdAt: Date;
}
