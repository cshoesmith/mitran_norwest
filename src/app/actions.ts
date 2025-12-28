'use server'

import { processMenu, MenuData } from '@/lib/menuProcessor';

export async function getMenuFromPDF(): Promise<MenuData> {
  return processMenu();
}
