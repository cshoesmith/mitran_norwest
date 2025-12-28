'use client';

import { MenuItem } from '@/types/menu';
import { useCartStore } from '@/store/cartStore';
import { useImageStore } from '@/store/imageStore';
import { Plus, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { incrementPending, decrementPending } = useImageStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!imageLoaded) {
      incrementPending();
      
      // Safety timeout: if image takes too long (e.g. 30s), stop counting it as "pending"
      // so the global indicator doesn't get stuck forever.
      let active = true;
      const timeout = setTimeout(() => {
        if (active) {
          decrementPending();
          active = false;
        }
      }, 30000);

      return () => {
        clearTimeout(timeout);
        if (active) {
          decrementPending();
        }
      };
    }
  }, [imageLoaded]); // Removed incrementPending/decrementPending from deps to avoid re-runs

  // Use item ID as seed for stable images
  const seed = item.id;
  // If imageQuery starts with http or /, use it directly. Otherwise construct Pollinations URL (legacy fallback)
  const imageUrl = item.imageQuery.startsWith('http') || item.imageQuery.startsWith('/') 
    ? item.imageQuery 
    : `https://image.pollinations.ai/prompt/${encodeURIComponent(item.imageQuery)}?width=400&height=400&nologo=true&seed=${seed}`;

  return (
    <>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsExpanded(true)}
      >
        <div className="relative h-48 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div className={`absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 gap-2 transition-opacity duration-500 ${imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="w-8 h-8 border-4 border-zinc-300 border-t-orange-600 rounded-full animate-spin"></div>
            <span className="text-xs font-medium flex items-center gap-1 animate-pulse">
              <Sparkles size={12} /> Generating...
            </span>
          </div>
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className={`object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized // Pollinations.ai might not work well with Next.js optimization without config
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg line-clamp-2">{item.name}</h3>
            <span className="font-bold text-green-600">${item.price.toFixed(2)}</span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-grow">
            {item.description || item.category}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addItem(item);
            }}
            className="w-full mt-auto bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add to Order
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-64 w-full">
                <Image
                  src={imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">{item.name}</h2>
                  <span className="text-xl font-bold text-green-600">${item.price.toFixed(2)}</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 mb-6">
                  {item.description || `Delicious ${item.name} from our ${item.category} selection.`}
                </p>
                <button
                  onClick={() => {
                    addItem(item);
                    setIsExpanded(false);
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
                >
                  <Plus size={24} />
                  Add to Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
