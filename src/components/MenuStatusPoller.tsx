'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MenuStatusPollerProps {
  isProcessing: boolean;
}

export default function MenuStatusPoller({ isProcessing }: MenuStatusPollerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      router.refresh();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [isProcessing, router]);

  return null;
}
