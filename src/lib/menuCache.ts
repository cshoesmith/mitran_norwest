import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const CACHE_FILE = path.join(process.cwd(), 'data', 'menu-cache.json');
const IMAGE_DIR = path.join(process.cwd(), 'public', 'menu-images');
const TTL = 5 * 24 * 60 * 60 * 1000; // 5 days

export interface CachedItem {
  name: string;
  description: string;
  imagePath: string; // Local path (e.g., '/menu-images/xyz.jpg') or Remote URL
  lastSeen: number;
  expiresAt: number;
}

interface CacheData {
  items: Record<string, CachedItem>;
}

// Ensure directories exist
async function ensureDirs() {
  if (!existsSync(path.dirname(CACHE_FILE))) {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  }
  if (!existsSync(IMAGE_DIR)) {
    await fs.mkdir(IMAGE_DIR, { recursive: true });
  }
}

// Load cache from disk
export async function loadCache(): Promise<CacheData> {
  await ensureDirs();
  try {
    if (existsSync(CACHE_FILE)) {
      const data = await fs.readFile(CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading cache:', error);
  }
  return { items: {} };
}

// Save cache to disk
export async function saveCache(cache: CacheData) {
  await ensureDirs();
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

// Download queue management
interface DownloadTask {
  url: string;
  filename: string;
  resolve: (value: string | null) => void;
}

const downloadQueue: DownloadTask[] = [];
let isProcessingQueue = false;
const DELAY_BETWEEN_DOWNLOADS = 2000; // 2 seconds delay to be safe

async function processQueue() {
  if (isProcessingQueue || downloadQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (downloadQueue.length > 0) {
    const task = downloadQueue.shift();
    if (!task) break;
    
    try {
      const response = await fetch(task.url);
      
      if (response.status === 429) {
        // Too many requests, put back in queue and wait longer
        console.warn(`Rate limited for ${task.filename}, waiting 5s...`);
        downloadQueue.unshift(task);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const filePath = path.join(IMAGE_DIR, task.filename);
      await fs.writeFile(filePath, buffer);
      
      task.resolve(`/menu-images/${task.filename}`);
      
    } catch (error) {
      console.error(`Failed to download image for ${task.filename}:`, error);
      task.resolve(null);
    }
    
    // Wait before next request
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_DOWNLOADS));
  }
  
  isProcessingQueue = false;
}

// Download image and return local path
export function downloadImage(url: string, filename: string): Promise<string | null> {
  return new Promise((resolve) => {
    downloadQueue.push({ url, filename, resolve });
    processQueue();
  });
}

export async function getCachedItem(cache: CacheData, name: string): Promise<CachedItem | undefined> {
  const key = name.toLowerCase().trim();
  const item = cache.items[key];
  
  if (item) {
    // Check if expired
    if (Date.now() > item.expiresAt) {
      // Expired, but we might want to keep the image/description if it's still the same dish?
      // The requirement says "reuse them if the menu changes, but the items are still valid".
      // If we are calling getCachedItem, it means the item IS in the current menu.
      // So we should just refresh the TTL.
      item.expiresAt = Date.now() + TTL;
      item.lastSeen = Date.now();
      return item;
    }
    
    // Update TTL since it's being accessed (valid)
    item.expiresAt = Date.now() + TTL;
    item.lastSeen = Date.now();
    return item;
  }
  return undefined;
}

export function updateCacheItem(cache: CacheData, name: string, description: string, imagePath: string) {
  const key = name.toLowerCase().trim();
  cache.items[key] = {
    name,
    description,
    imagePath,
    lastSeen: Date.now(),
    expiresAt: Date.now() + TTL
  };
}
