import { create } from 'zustand';

interface UIState {
  showOnboarding: boolean;
  setShowOnboarding: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  showOnboarding: false,
  setShowOnboarding: (visible) => set({ showOnboarding: visible }),
}));
