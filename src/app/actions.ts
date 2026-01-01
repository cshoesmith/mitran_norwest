'use server'

import { getMenuData, MenuData, triggerMenuUpdate } from '@/lib/menuProcessor';

export async function getMenuFromPDF(location: 'norwest' | 'dural' = 'norwest'): Promise<MenuData> {
  return getMenuData(location);
}

export async function forceRefreshMenu(location: 'norwest' | 'dural' = 'norwest'): Promise<void> {
  await triggerMenuUpdate(true, location);
}
