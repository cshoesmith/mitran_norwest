'use server'

import { getMenuData, MenuData, triggerMenuUpdate } from '@/lib/menuProcessor';

export async function getMenuFromPDF(location: 'norwest' | 'dural' = 'norwest'): Promise<MenuData> {
  return getMenuData(location);
}

export async function forceRefreshMenu(location: 'norwest' | 'dural' = 'norwest'): Promise<void> {
  await triggerMenuUpdate(true, location);
}

export async function performMenuUpdate(location: 'norwest' | 'dural' = 'norwest'): Promise<void> {
  // This action is called by the client to keep the serverless function alive
  // while the update runs.
  await triggerMenuUpdate(false, location);
}
