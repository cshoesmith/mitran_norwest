import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black gap-4">
      <div className="relative">
        <div className="absolute inset-0 bg-orange-500 blur-xl opacity-20 animate-pulse"></div>
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin relative z-10" />
      </div>
      <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 animate-pulse">
        Fetching Today's Menu...
      </h2>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm">
        Parsing PDF and preparing dishes
      </p>
    </div>
  );
}
