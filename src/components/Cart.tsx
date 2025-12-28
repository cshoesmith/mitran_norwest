'use client';

import { useCartStore } from '@/store/cartStore';
import { ShoppingBag, X, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Cart() {
  const { items, total, updateQuantity } = useCartStore();
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">{items.reduce((acc, i) => acc + i.quantity, 0)} items</span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">${total().toFixed(2)}</span>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-600/20"
          >
            <ShoppingBag size={20} />
            View Order
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <ShoppingBag className="text-orange-600" />
                  Your Order
                </h2>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-start">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg leading-tight mb-1">{item.name}</h3>
                      <p className="text-zinc-500 text-sm">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 h-fit shrink-0">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-colors text-zinc-600 dark:text-zinc-300"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded-md transition-colors text-zinc-600 dark:text-zinc-300"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="font-bold text-lg min-w-[4rem] text-right">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-medium text-zinc-600 dark:text-zinc-400">Total</span>
                  <span className="text-3xl font-bold text-orange-600">${total().toFixed(2)}</span>
                </div>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-xl shadow-lg shadow-green-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Checkout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
