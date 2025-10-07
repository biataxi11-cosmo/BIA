'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { List } from 'lucide-react';

type RidesIconWithBadgeProps = {
  sizeClass?: string;
};

function useRequestedRidesCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'rides'), where('status', '==', 'requested'));
    const unsub = onSnapshot(q, (snap) => {
      setCount(snap.size);
    });
    return () => unsub();
  }, []);

  return count;
}

export function RidesIconWithBadge({ sizeClass = 'h-6 w-6' }: RidesIconWithBadgeProps) {
  const count = useRequestedRidesCount();

  return (
    <div className="relative inline-block">
      <List className={sizeClass} />
      {count > 0 && (
        <>
          {/* Glow ping */}
          <span
            className="absolute -top-1 -right-1 inline-flex h-4 w-4 rounded-full bg-red-500/60 animate-ping"
            aria-hidden="true"
          />
          {/* Solid bubble with count */}
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] leading-none h-4 min-w-4 px-1 shadow ring-2 ring-red-400/50"
            aria-label={`${count} new ride request${count > 1 ? 's' : ''}`}
          >
            {count}
          </span>
        </>
      )}
    </div>
  );
}


