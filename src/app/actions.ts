'use server'

import { getMenuData, MenuData } from '@/lib/menuProcessor';

export async function getMenuFromPDF(): Promise<MenuData> {
  return getMenuData();
}
