import { create } from 'zustand';

interface ImageStore {
  pendingImages: number;
  pendingItemNames: string[];
  incrementPending: (name: string) => void;
  decrementPending: (name: string) => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  pendingImages: 0,
  pendingItemNames: [],
  incrementPending: (name) => set((state) => ({ 
    pendingImages: state.pendingImages + 1,
    pendingItemNames: [...state.pendingItemNames, name]
  })),
  decrementPending: (name) => set((state) => ({ 
    pendingImages: Math.max(0, state.pendingImages - 1),
    pendingItemNames: state.pendingItemNames.filter(n => n !== name)
  })),
}));
