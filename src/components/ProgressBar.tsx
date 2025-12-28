'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
  stage: string;
}

export default function ProgressBar({ current, total, stage }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((current / total) * 100)));

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      <div className="flex justify-between text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
        <span>{stage}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-orange-600"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
