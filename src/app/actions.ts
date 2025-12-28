'use server'

import { getMenuData, MenuData, triggerMenuUpdate } from '@/lib/menuProcessor';

export async function getMenuFromPDF(): Promise<MenuData> {
  return getMenuData();
}

export async function forceRefreshMenu(): Promise<void> {
  await triggerMenuUpdate(true);
}
