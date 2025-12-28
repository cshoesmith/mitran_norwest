import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const CACHE_FILE = path.join(process.cwd(), 'data', 'menu-cache.json');
const IMAGE_DIR = path.join(process.cwd(), 'public', 'menu-images');
const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

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
let currentDelay = 100; // Start very fast (100ms)

async function processQueue() {
  if (isProcessingQueue || downloadQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (downloadQueue.length > 0) {
    const task = downloadQueue.shift();
    if (!task) break;
    
    try {
      const response = await fetch(task.url);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        let waitTime = 10000; // Default 10s (reduced from 20s)
        
        if (retryAfter) {
          const seconds = parseInt(retryAfter, 10);
          if (!isNaN(seconds)) {
            waitTime = seconds * 1000;
          }
        }
        
        // Add a small buffer
        waitTime += 500;

        console.warn(`Rate limited for ${task.filename}. Retry-After: ${retryAfter}. Waiting ${Math.ceil(waitTime/1000)}s...`);
        downloadQueue.push(task); // Move to end of queue
        
        // Increase base delay to avoid hitting it again immediately
        currentDelay = Math.min(currentDelay * 2, 10000);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      // Check for rate limit headers to optimize speed
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining) {
        const count = parseInt(remaining, 10);
        if (!isNaN(count)) {
           if (count < 5) currentDelay = 5000;
           else if (count < 10) currentDelay = 2000;
           else currentDelay = 100; // Go fast if we have quota
        }
      } else {
        // If no headers, slowly recover speed if we were slow
        currentDelay = Math.max(100, currentDelay * 0.8);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      
      if (buffer.length < 1000) {
         throw new Error(`Downloaded image is too small (${buffer.length} bytes). Possible error response.`);
      }

      const filePath = path.join(IMAGE_DIR, task.filename);
      await fs.writeFile(filePath, buffer);
      
      task.resolve(`/menu-images/${task.filename}`);
      
    } catch (error) {
      console.error(`Failed to download image for ${task.filename}:`, error);
      task.resolve(null);
    }
    
    // Wait before next request
    await new Promise(resolve => setTimeout(resolve, currentDelay));
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
    // Check if local file exists and is valid
    if (item.imagePath && item.imagePath.startsWith('/menu-images/')) {
      const localPath = path.join(process.cwd(), 'public', item.imagePath);
      try {
        const stats = await fs.stat(localPath);
        if (stats.size < 1000) { // Less than 1KB is suspicious for an image
           console.warn(`Cached image for ${name} is too small (${stats.size} bytes). Invalidating.`);
           delete cache.items[key];
           return undefined;
        }
      } catch (e) {
        console.warn(`Cached image for ${name} not found on disk. Invalidating.`);
        delete cache.items[key];
        return undefined;
      }
    }

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
