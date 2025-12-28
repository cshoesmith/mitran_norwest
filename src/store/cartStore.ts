import { create } from 'zustand';
import { CartItem, MenuItem } from '@/types/menu';

interface CartStore {
  items: CartItem[];
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => set((state) => {
    const existingItem = state.items.find((i) => i.id === item.id);
    if (existingItem) {
      return {
        items: state.items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };
    }
    return { items: [...state.items, { ...item, quantity: 1 }] };
  }),
  removeItem: (itemId) => set((state) => ({
    items: state.items.filter((i) => i.id !== itemId),
  })),
  updateQuantity: (itemId, quantity) => set((state) => {
    if (quantity <= 0) {
      return { items: state.items.filter((i) => i.id !== itemId) };
    }
    return {
      items: state.items.map((i) =>
        i.id === itemId ? { ...i, quantity } : i
      ),
    };
  }),
  clearCart: () => set({ items: [] }),
  total: () => {
    const items = get().items;
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
}));
