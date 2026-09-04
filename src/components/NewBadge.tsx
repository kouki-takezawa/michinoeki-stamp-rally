import { useState } from 'react';
import { shouldShowNewBadge } from '../lib/newBadge';

export function NewBadge({ featureKey }: { featureKey: string }) {
  const [show] = useState(() => shouldShowNewBadge(featureKey));
  if (!show) return null;
  return (
    <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>
  );
}
