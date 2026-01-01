import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { kv } from '@vercel/kv';
import { put, list } from '@vercel/blob';
import { MenuSection } from '@/types/menu';

const DATA_DIR = path.join(process.cwd(), 'data');
const USE_KV = !!process.env.KV_REST_API_URL;
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const IS_VERCEL = !!process.env.VERCEL;

// In-memory fallback for Vercel without KV/Blob (prevents EROFS crashes)
const memoryState: Record<string, MenuState> = {};

function getStateFile(location: string = 'norwest') {
  return path.join(DATA_DIR, `menu-state-${location}.json`);
}

export type MenuStatus = 'idle' | 'fetching-pdf' | 'parsing-pdf' | 'generating-content' | 'complete' | 'error';

export interface MenuState {
  status: MenuStatus;
  lastUpdated: number; // When the menu was last successfully completed
  updatedAt?: number; // When the state was last modified (for stale lock detection)
  sections: MenuSection[];
  menuDate?: string;
  error?: string;
  progress?: {
    current: number;
    total: number;
    stage: string;
  };
}

const DEFAULT_STATE: MenuState = {
  status: 'idle',
  lastUpdated: 0,
  updatedAt: 0,
  sections: [],
};

export async function getMenuState(location: string = 'norwest'): Promise<MenuState> {
  try {
    if (USE_KV) {
      const state = await kv.get<MenuState>(`menu-state:${location}`);
      return state || DEFAULT_STATE;
    }

    if (USE_BLOB) {
      try {
        const filename = `menu-state-${location}.json`;
        const { blobs } = await list({ prefix: filename, limit: 1 });
        if (blobs.length > 0) {
          const response = await fetch(blobs[0].url);
          if (response.ok) {
            return await response.json();
          }
        }
      } catch (error: any) {
        console.error(`[MenuState] Error reading from Blob:`, error);
        if (error.message?.includes('suspended')) {
          console.warn(`[MenuState] Blob suspended. Falling back to memory for ${location}.`);
          return memoryState[location] || DEFAULT_STATE;
        }
      }
      return DEFAULT_STATE;
    }

    if (IS_VERCEL) {
      console.warn(`[MenuState] Vercel detected but KV/Blob not configured. Using in-memory state for ${location}.`);
      return memoryState[location] || DEFAULT_STATE;
    }

    const stateFile = getStateFile(location);
    if (existsSync(stateFile)) {
      const data = await fs.readFile(stateFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading menu state for ${location}:`, error);
  }
  return DEFAULT_STATE;
}

let isWriting = false;
const writeQueue: Array<() => Promise<void>> = [];

async function processWriteQueue() {
  if (isWriting) return;
  isWriting = true;

  while (writeQueue.length > 0) {
    const task = writeQueue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        console.error('Error in write queue task:', error);
      }
    }
  }

  isWriting = false;
}

export async function updateMenuState(updates: Partial<MenuState>, location: string = 'norwest') {
  return new Promise<MenuState>((resolve, reject) => {
    writeQueue.push(async () => {
      try {
        const current = await getMenuState(location);
        const newState = { ...current, ...updates, updatedAt: Date.now() };
        
        if (USE_KV) {
          await kv.set(`menu-state:${location}`, newState);
        } else if (USE_BLOB) {
          console.log(`[MenuState] Writing to Blob: menu-state-${location}.json with allowOverwrite: true`);
          try {
            // @ts-ignore - allowOverwrite is required for Vercel Blob updates
            await put(`menu-state-${location}.json`, JSON.stringify(newState), { access: 'public', addRandomSuffix: false, allowOverwrite: true });
          } catch (error: any) {
            if (error.message?.includes('suspended')) {
               console.warn(`[MenuState] Blob suspended during write. Falling back to memory for ${location}.`);
               memoryState[location] = newState;
            } else {
               throw error;
            }
          }
        } else {
          try {
            // Try writing to disk, fallback to memory if it fails (e.g. EROFS on Vercel)
            if (IS_VERCEL) throw new Error("Vercel detected, skipping disk write");
            await fs.writeFile(getStateFile(location), JSON.stringify(newState, null, 2));
          } catch (err: any) {
            if (err.code === 'EROFS' || err.message.includes('Vercel')) {
               console.warn(`[MenuState] Read-only file system detected. Using in-memory state for ${location}.`);
               memoryState[location] = newState;
            } else {
               throw err;
            }
          }
        }
        
        resolve(newState);
      } catch (error) {
        console.error(`Error writing menu state for ${location}:`, error);
        reject(error);
      }
    });
    processWriteQueue();
  });
}

export async function resetMenuState(location: string = 'norwest') {
  console.log(`[MenuState] Resetting menu state for ${location}...`);
  await updateMenuState(DEFAULT_STATE, location);
}

export async function updateMenuItemImage(itemId: string, imagePath: string, location: string = 'norwest') {
  return new Promise<void>((resolve, reject) => {
    writeQueue.push(async () => {
      try {
        const state = await getMenuState(location);
        let updated = false;
        
        for (const section of state.sections) {
          const item = section.items.find(i => i.id === itemId);
          if (item) {
            item.imageQuery = imagePath;
            updated = true;
            break;
          }
        }
        
        if (updated) {
           if (USE_KV) {
             await kv.set(`menu-state:${location}`, state);
           } else if (USE_BLOB) {
             console.log(`[MenuState] Updating image in Blob: menu-state-${location}.json`);
             try {
               // @ts-ignore - allowOverwrite is required for Vercel Blob updates
               await put(`menu-state-${location}.json`, JSON.stringify(state), { access: 'public', addRandomSuffix: false, allowOverwrite: true });
             } catch (error: any) {
                if (error.message?.includes('suspended')) {
                   console.warn(`[MenuState] Blob suspended during image update. Falling back to memory for ${location}.`);
                   memoryState[location] = state;
                } else {
                   throw error;
                }
             }
           } else {
             try {
               if (IS_VERCEL) throw new Error("Vercel detected, skipping disk write");
               await fs.writeFile(getStateFile(location), JSON.stringify(state, null, 2));
             } catch (err: any) {
               if (err.code === 'EROFS' || err.message.includes('Vercel')) {
                  console.warn(`[MenuState] Read-only file system detected. Using in-memory state for ${location}.`);
                  memoryState[location] = state;
               } else {
                  throw err;
               }
             }
           }
        }
        resolve();
      } catch (error) {
        console.error(`Error updating menu item image for ${location}:`, error);
        reject(error);
      }
    });
    processWriteQueue();
  });
}
