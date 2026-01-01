'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { performMenuUpdate } from '@/app/actions';

interface MenuStatusPollerProps {
  isProcessing: boolean;
}

export default function MenuStatusPoller({ isProcessing }: MenuStatusPollerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const location = (searchParams.get('location') === 'dural' ? 'dural' : 'norwest') as 'norwest' | 'dural';
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!isProcessing) return;

    // Trigger the update via Server Action to keep the process alive
    if (!hasTriggered.current) {
      hasTriggered.current = true;
      console.log('Triggering menu update via Server Action...');
      performMenuUpdate(location).catch(err => {
        console.error('Error triggering menu update:', err);
      });
    }

    const interval = setInterval(() => {
      router.refresh();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [isProcessing, router, location]);

  return null;
}
