import { useState } from 'react';
import { useFriends } from '../hooks/useFriends';
import { FriendStampBook } from './FriendStampBook';

export function FriendsScreen() {
  const { myProfile, friendsData, loading, addByCode, accept, remove } = useFriends();
  const [code, setCode] = useState('');
  const [addStatus, setAddStatus] = useState<{ type: 'idle' | 'error' | 'success'; message?: string }>({
    type: 'idle',
  });
  const [viewingFriendId, setViewingFriendId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const { error } = await addByCode(code);
    if (error) {
      setAddStatus({ type: 'error', message: error });
    } else {
      setAddStatus({ type: 'success', message: '友達申請を送りました' });
      setCode('');
    }
  };

  const viewingFriend = friendsData.friends.find((f) => f.profile.id === viewingFriendId);

  return (
    <div className="mx-auto max-w-xl px-4 py-6 lg:max-w-2xl">
      <div className="mb-1 text-xs font-bold tracking-wide text-accent">FRIENDS</div>
      <h1 className="mb-5 text-2xl font-black">友達</h1>

      <div className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="mb-2 text-sm font-bold">あなたの友達コード</div>
        {myProfile ? (
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-surface-2 px-3 py-2 font-mono text-lg font-bold tracking-widest">
              {myProfile.friendCode}
            </span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(myProfile.friendCode)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-accent"
            >
              コピー
            </button>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">読み込み中…</p>
        )}
        <p className="mt-2 text-[11px] text-ink-faint">
          このコードを友達に伝えてもらい、下の欄に入力してもらうと友達申請が送れます。
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="mb-2 text-sm font-bold">友達コードで追加</div>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setAddStatus({ type: 'idle' });
            }}
            placeholder="友達の7桁コード"
            maxLength={7}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm uppercase tracking-widest"
          />
          <button type="submit" className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white">
            申請する
          </button>
        </form>
        {addStatus.type !== 'idle' && (
          <p className={`mt-2 text-xs ${addStatus.type === 'error' ? 'text-red-600' : 'text-accent'}`}>
            {addStatus.message}
          </p>
        )}
      </div>

      {friendsData.incomingRequests.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 text-sm font-bold">届いている申請（{friendsData.incomingRequests.length}件）</div>
          <div className="overflow-hidden rounded-lg border border-border">
            {friendsData.incomingRequests.map((r) => (
              <div
                key={r.friendshipId}
                className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 last:border-b-0"
              >
                <span className="font-bold">{r.profile.displayName}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => accept(r.friendshipId)}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white"
                  >
                    承認
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r.friendshipId)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-ink-muted"
                  >
                    拒否
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {friendsData.outgoingRequests.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 text-sm font-bold">申請中（{friendsData.outgoingRequests.length}件）</div>
          <div className="overflow-hidden rounded-lg border border-border">
            {friendsData.outgoingRequests.map((r) => (
              <div
                key={r.friendshipId}
                className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 last:border-b-0"
              >
                <span className="text-ink-muted">{r.profile.displayName}</span>
                <button type="button" onClick={() => remove(r.friendshipId)} className="text-xs text-ink-faint underline">
                  取り消す
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-2 text-sm font-bold">友達（{friendsData.friends.length}人）</div>
        {loading ? (
          <p className="text-sm text-ink-muted">読み込み中…</p>
        ) : friendsData.friends.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-ink-muted">
            まだ友達がいません。友達コードを交換して追加しましょう。
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {friendsData.friends.map((f) => (
              <button
                key={f.friendshipId}
                type="button"
                onClick={() => setViewingFriendId(f.profile.id)}
                className="flex w-full items-center justify-between border-b border-border bg-surface px-4 py-3 text-left last:border-b-0 hover:bg-surface-2"
              >
                <span className="font-bold">{f.profile.displayName}</span>
                <span className="text-xs text-accent">スタンプ帳を見る →</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {viewingFriend && <FriendStampBook friend={viewingFriend.profile} onClose={() => setViewingFriendId(null)} />}
    </div>
  );
}
