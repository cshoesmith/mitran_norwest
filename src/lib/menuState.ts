import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { kv } from '@vercel/kv';
import { MenuSection } from '@/types/menu';

const DATA_DIR = path.join(process.cwd(), 'data');
const USE_KV = !!process.env.KV_REST_API_URL;

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
        } else {
          await fs.writeFile(getStateFile(location), JSON.stringify(newState, null, 2));
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
           } else {
             await fs.writeFile(getStateFile(location), JSON.stringify(state, null, 2));
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
