import { create } from 'zustand';

interface ImageStore {
  pendingImages: number;
  incrementPending: () => void;
  decrementPending: () => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  pendingImages: 0,
  incrementPending: () => set((state) => ({ pendingImages: state.pendingImages + 1 })),
  decrementPending: () => set((state) => ({ pendingImages: Math.max(0, state.pendingImages - 1) })),
}));
