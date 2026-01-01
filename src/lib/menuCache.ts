import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { kv } from '@vercel/kv';
import { put, list } from '@vercel/blob';

const CACHE_FILE = path.join(process.cwd(), 'data', 'menu-cache.json');
const IMAGE_DIR = path.join(process.cwd(), 'public', 'menu-images');
const TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const FALLBACK_FILENAME = 'fallback-chef.jpg';
const USE_KV = !!process.env.KV_REST_API_URL;
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const IS_VERCEL = !!process.env.VERCEL;

// In-memory fallback for Vercel without KV
let memoryCache: CacheData = { items: {} };

export interface CachedItem {
  name: string;
  description: string;
  imagePath: string; // Local path (e.g., '/menu-images/xyz.jpg') or Remote URL
  imageUrl?: string; // External URL from scraping
  lastSeen: number;
  expiresAt: number;
}

interface CacheData {
  items: Record<string, CachedItem>;
}

// Ensure directories exist
async function ensureDirs() {
  if (USE_KV || USE_BLOB || IS_VERCEL) return;

  if (!existsSync(path.dirname(CACHE_FILE))) {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  }
  if (!existsSync(IMAGE_DIR)) {
    await fs.mkdir(IMAGE_DIR, { recursive: true });
  }
}

// Load cache from disk
export async function loadCache(): Promise<CacheData> {
  if (USE_KV) {
    try {
      const cache = await kv.get<CacheData>('menu-cache');
      return cache || { items: {} };
    } catch (error) {
      console.error('Error loading cache from KV:', error);
      return { items: {} };
    }
  }

  if (USE_BLOB) {
    try {
      const { blobs } = await list({ prefix: 'menu-cache.json', limit: 1 });
      if (blobs.length > 0) {
        const response = await fetch(blobs[0].url);
        if (response.ok) {
          return await response.json();
        }
      }
    } catch (error: any) {
      console.error('Error loading cache from Blob:', error);
      if (error.message?.includes('suspended')) {
         console.warn('[MenuCache] Blob suspended. Using memory cache.');
         return memoryCache;
      }
    }
    return { items: {} };
  }

  if (IS_VERCEL) {
    return memoryCache;
  }

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
  if (USE_KV) {
    try {
      await kv.set('menu-cache', cache);
    } catch (error) {
      console.error('Error saving cache to KV:', error);
    }
    return;
  }

  if (USE_BLOB) {
    try {
      // @ts-ignore - allowOverwrite is required for Vercel Blob updates
      await put('menu-cache.json', JSON.stringify(cache), { access: 'public', addRandomSuffix: false, allowOverwrite: true });
    } catch (error: any) {
      console.error('Error saving cache to Blob:', error);
      if (error.message?.includes('suspended')) {
         console.warn('[MenuCache] Blob suspended. Falling back to memory cache.');
         memoryCache = cache;
      }
    }
    return;
  }

  try {
    if (IS_VERCEL) throw new Error("Vercel detected");
    await ensureDirs();
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error: any) {
    if (error.code === 'EROFS' || error.message.includes('Vercel')) {
       memoryCache = cache;
    } else {
       console.error('Error saving cache:', error);
    }
  }
}

// Download queue management
interface DownloadTask {
  url: string;
  filename: string;
  itemName?: string;
  resolve: (value: string | null) => void;
  retryCount: number;
}

async function ensureFallbackImage(): Promise<string | null> {
  const localPath = path.join(IMAGE_DIR, FALLBACK_FILENAME);
  if (existsSync(localPath)) {
      return `/menu-images/${FALLBACK_FILENAME}`;
  }
  
  if (USE_KV || USE_BLOB || IS_VERCEL) return null; // Cannot generate/save images on Vercel runtime

  try {
      console.log('[Fallback] Generating fallback image...');
      const prompt = 'cartoon indian chef with his hands in the air shrugging confused white background';
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=400&height=400&nologo=true`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(response.statusText);
      
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(localPath, buffer);
      console.log('[Fallback] Saved fallback image.');
      return `/menu-images/${FALLBACK_FILENAME}`;
  } catch (error) {
      console.error('[Fallback] Failed to generate fallback image:', error);
      return null;
  }
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
      const displayName = task.itemName || task.filename;
      console.log(`[Download Queue] Processing: ${displayName}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
      
      const response = await fetch(task.url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
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
         console.error(`[Debug] Failed Image Response for ${displayName}:`);
         console.error(`- Status: ${response.status}`);
         console.error(`- Content-Type: ${response.headers.get('content-type')}`);
         console.error(`- Body Preview: "${buffer.toString('utf8').substring(0, 200)}"`);
         
         throw new Error(`Downloaded image is too small (${buffer.length} bytes). Possible error response.`);
      }

      const filePath = path.join(IMAGE_DIR, task.filename);
      await fs.writeFile(filePath, buffer);
      
      console.log(`[Download Queue] Saved: ${displayName}`);
      task.resolve(`/menu-images/${task.filename}`);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`Timeout: Download for ${task.itemName || task.filename} took longer than 60s.`);
      } else {
        console.error(`Failed to download image for ${task.itemName || task.filename}:`, error);
      }
      
      if (task.retryCount < 3) {
        task.retryCount++;
        
        // Rotate seed to avoid deterministic failures
        if (task.url.includes('pollinations.ai') && task.url.includes('&seed=')) {
            const newSeed = Math.floor(Math.random() * 1000000);
            task.url = task.url.replace(/&seed=[^&]+/, `&seed=${newSeed}`);
            console.log(`[Download Queue] Rotated seed to ${newSeed} for retry of ${task.itemName || task.filename}`);
        }

        const delay = 2000 * task.retryCount;
        console.log(`[Download Queue] Retrying ${task.itemName || task.filename} in ${delay}ms (Attempt ${task.retryCount}/3)...`);
        
        // Add back to queue after delay
        setTimeout(() => {
          downloadQueue.push(task);
          processQueue();
        }, delay);
      } else {
        console.error(`[Download Queue] Giving up on ${task.itemName || task.filename} after 3 retries.`);
        const fallback = await ensureFallbackImage();
        task.resolve(fallback);
      }
    }
    
    // Wait before next request, retryCount: 0
    if (currentDelay >= 1000) {
      console.log(`[Download Queue] Sleeping for ${currentDelay}ms (Rate Limit Strategy)...`);
    }
    await new Promise(resolve => setTimeout(resolve, currentDelay));
  }
  
  console.log('[Download Queue] All background image downloads complete.');
  isProcessingQueue = false;
}

// Download image and return local path
export function downloadImage(url: string, filename: string, itemName?: string): Promise<string | null> {
  if (USE_KV || USE_BLOB || IS_VERCEL) return Promise.resolve(null); // Cannot download/save images on Vercel runtime

  return new Promise((resolve) => {
    downloadQueue.push({ url, filename, itemName, resolve, retryCount: 0 });
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

export function updateCacheItem(cache: CacheData, name: string, description: string, imagePath: string, imageUrl?: string) {
  const key = name.toLowerCase().trim();
  cache.items[key] = {
    name,
    description,
    imagePath,
    imageUrl,
    lastSeen: Date.now(),
    expiresAt: Date.now() + TTL
  };
}
