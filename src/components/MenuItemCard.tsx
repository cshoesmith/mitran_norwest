'use client';

import { MenuItem } from '@/types/menu';
import { useCartStore } from '@/store/cartStore';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div 
        className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow h-full"
        onClick={() => setIsExpanded(true)}
      >
        {item.imageUrl && (
          <div className="relative w-full h-48 bg-zinc-100 dark:bg-zinc-800">
            <Image 
              src={item.imageUrl} 
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
        <div className="p-3 md:p-5 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2 md:mb-3">
            <h3 className="font-bold text-base md:text-lg leading-tight">{item.name}</h3>
            <span className="font-bold text-green-600 ml-2 whitespace-nowrap text-sm md:text-base">${Number(item.price).toFixed(2)}</span>
          </div>
          <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-3 md:mb-4 flex-grow leading-relaxed">
            {item.description || item.category}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addItem(item);
            }}
            className="w-full mt-auto bg-orange-600 hover:bg-orange-700 text-white py-2 md:py-2.5 rounded-lg flex items-center justify-center gap-1.5 md:gap-2 transition-colors font-medium text-sm md:text-base"
          >
            <Plus size={16} className="md:w-[18px] md:h-[18px]" />
            Add
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 relative">
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                >
                  ✕
                </button>
                
                <div className="flex justify-between items-start mb-4 pr-8">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{item.name}</h2>
                </div>
                
                {item.imageUrl && (
                  <div className="relative w-full h-64 mb-6 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <Image 
                      src={item.imageUrl} 
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="mb-6">
                   <span className="text-2xl font-bold text-green-600">${item.price.toFixed(2)}</span>
                </div>

                <p className="text-zinc-600 dark:text-zinc-300 mb-8 text-lg leading-relaxed">
                  {item.description || `Delicious ${item.name} from our ${item.category} selection.`}
                </p>
                
                <button
                  onClick={() => {
                    addItem(item);
                    setIsExpanded(false);
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3.5 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
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

