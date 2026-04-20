import { create } from 'zustand';
import { Folder, MediaItem, UploadProgress } from '../config/types';

interface FolderState {
  folders: Folder[];
  currentFolder: Folder | null;
  mediaItems: MediaItem[];
  uploadProgress: UploadProgress[];
  isLoadingFolders: boolean;
  isLoadingMedia: boolean;

  // Folder actions
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, data: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  setCurrentFolder: (folder: Folder | null) => void;

  // Media actions
  setMediaItems: (items: MediaItem[]) => void;
  addMediaItem: (item: MediaItem) => void;
  removeMediaItem: (id: string) => void;

  // Upload actions
  setUploadProgress: (progress: UploadProgress[]) => void;
  updateUploadProgress: (fileName: string, update: Partial<UploadProgress>) => void;
  clearUploadProgress: () => void;

  // Loading
  setLoadingFolders: (loading: boolean) => void;
  setLoadingMedia: (loading: boolean) => void;
}

export const useFolderStore = create<FolderState>((set) => ({
  folders: [],
  currentFolder: null,
  mediaItems: [],
  uploadProgress: [],
  isLoadingFolders: false,
  isLoadingMedia: false,

  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => set((state) => ({ folders: [folder, ...state.folders] })),
  updateFolder: (id, data) =>
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, ...data } : f)),
    })),
  deleteFolder: (id) =>
    set((state) => ({ folders: state.folders.filter((f) => f.id !== id) })),
  setCurrentFolder: (currentFolder) => set({ currentFolder }),

  setMediaItems: (mediaItems) => set({ mediaItems }),
  addMediaItem: (item) =>
    set((state) => ({ mediaItems: [item, ...state.mediaItems] })),
  removeMediaItem: (id) =>
    set((state) => ({ mediaItems: state.mediaItems.filter((m) => m.id !== id) })),

  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  updateUploadProgress: (fileName, update) =>
    set((state) => ({
      uploadProgress: state.uploadProgress.map((p) =>
        p.fileName === fileName ? { ...p, ...update } : p,
      ),
    })),
  clearUploadProgress: () => set({ uploadProgress: [] }),

  setLoadingFolders: (isLoadingFolders) => set({ isLoadingFolders }),
  setLoadingMedia: (isLoadingMedia) => set({ isLoadingMedia }),
}));
