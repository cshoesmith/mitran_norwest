export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: string;
  imageQuery: string;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export interface CartItem extends MenuItem {
  quantity: number;
}
