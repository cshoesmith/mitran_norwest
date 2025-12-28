'use client';

import { useImageStore } from '@/store/imageStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

export default function ImageGenerationProgress() {
  const { pendingImages, pendingItemNames } = useImageStore();
  
  // Get the most recent item added to the queue
  const currentItem = pendingItemNames[pendingItemNames.length - 1];
  const otherCount = pendingImages - 1;

  return (
    <AnimatePresence>
      {pendingImages > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 right-4 z-50 bg-zinc-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl border border-zinc-700 flex items-center gap-4 max-w-sm"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500 blur-lg opacity-50 animate-pulse"></div>
            <div className="relative bg-zinc-800 p-2 rounded-full">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          </div>
          <div className="flex flex-col">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-400" />
              AI Kitchen Busy
            </h4>
            <p className="text-xs text-zinc-400">
              {currentItem ? (
                <>
                  Working on <span className="font-semibold text-orange-400">{currentItem}</span>
                  {otherCount > 0 && ` +${otherCount} more`}
                </>
              ) : (
                `Updating photos for ${pendingImages} dishes...`
              )}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
