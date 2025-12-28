import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { MenuSection } from '@/types/menu';

const STATE_FILE = path.join(process.cwd(), 'data', 'menu-state.json');

export type MenuStatus = 'idle' | 'fetching-pdf' | 'parsing-pdf' | 'generating-content' | 'complete' | 'error';

export interface MenuState {
  status: MenuStatus;
  lastUpdated: number; // When the menu was last successfully completed
  updatedAt?: number; // When the state was last modified (for stale lock detection)
  sections: MenuSection[];
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

export async function getMenuState(): Promise<MenuState> {
  try {
    if (existsSync(STATE_FILE)) {
      const data = await fs.readFile(STATE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading menu state:', error);
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

export async function updateMenuState(updates: Partial<MenuState>) {
  return new Promise<MenuState>((resolve, reject) => {
    writeQueue.push(async () => {
      try {
        const current = await getMenuState();
        const newState = { ...current, ...updates, updatedAt: Date.now() };
        await fs.writeFile(STATE_FILE, JSON.stringify(newState, null, 2));
        resolve(newState);
      } catch (error) {
        console.error('Error writing menu state:', error);
        reject(error);
      }
    });
    processWriteQueue();
  });
}

export async function updateMenuItemImage(itemId: string, imagePath: string) {
  return new Promise<void>((resolve, reject) => {
    writeQueue.push(async () => {
      try {
        const state = await getMenuState();
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
           await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
        }
        resolve();
      } catch (error) {
        console.error('Error updating menu item image:', error);
        reject(error);
      }
    });
    processWriteQueue();
  });
}
