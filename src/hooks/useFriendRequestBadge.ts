import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../lib/ToastContext';

const POLL_MS = 60_000;

// 友達申請の件数をタブバーのバッジに出すための軽量ポーリング。
// count:'exact', head:trueで行本体は取得せず件数だけ数えるので負荷は小さい。
export function useFriendRequestBadge() {
  const { user } = useAuth();
  const { show } = useToast();
  const [count, setCount] = useState(0);
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) {
      setCount(0);
      prevCountRef.current = null;
      return;
    }

    let cancelled = false;
    const poll = async () => {
      const { count: n } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('addressee_id', user.id)
        .eq('status', 'pending');
      if (cancelled || n === null) return;
      setCount(n);
      if (prevCountRef.current !== null && n > prevCountRef.current) {
        show('新しい友達申請が届いています');
      }
      prevCountRef.current = n;
    };

    void poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, show]);

  return count;
}
