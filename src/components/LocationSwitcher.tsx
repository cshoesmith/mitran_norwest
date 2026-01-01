'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';

export default function LocationSwitcher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentLocation = searchParams.get('location') || 'norwest';

  const handleLocationChange = (location: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('location', location);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex justify-center mb-6">
      <div className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg inline-flex">
        <button
          onClick={() => handleLocationChange('norwest')}
          className={clsx(
            "px-4 py-2 rounded-md text-sm font-medium transition-all",
            currentLocation === 'norwest'
              ? "bg-white dark:bg-zinc-700 text-orange-600 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          Norwest
        </button>
        <button
          onClick={() => handleLocationChange('dural')}
          className={clsx(
            "px-4 py-2 rounded-md text-sm font-medium transition-all",
            currentLocation === 'dural'
              ? "bg-white dark:bg-zinc-700 text-orange-600 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          Dural
        </button>
      </div>
    </div>
  );
}
