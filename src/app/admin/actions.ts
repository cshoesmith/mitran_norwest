'use server';

import { cookies } from 'next/headers';
import { clearCache } from '@/lib/menuCache';
import { resetMenuState } from '@/lib/menuState';

const ADMIN_PASSWORD = 'Abcd1234_';
const COOKIE_NAME = 'admin_session';

async function isAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  return session?.value === 'true';
}

export async function login(password: string) {
  if (password === ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, 'true', { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 // 1 day
    });
    return true;
  }
  return false;
}

export async function clearDescriptionCache() {
  if (!await isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  await clearCache();
}

export async function resetMenu(location: 'norwest' | 'dural') {
  if (!await isAuthenticated()) {
    throw new Error('Unauthorized');
  }
  await resetMenuState(location);
}
