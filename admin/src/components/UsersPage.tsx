import { useEffect, useMemo, useState } from 'react';
import { listUsers } from '../lib/api';
import type { AdminUserRow } from '../lib/types';
import { UserDetailDrawer } from './UserDetailDrawer';

export function UsersPage() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = () => {
    listUsers()
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        u.friend_code.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q),
    );
  }, [users, query]);

  if (error) return <p className="text-sm text-red-600">読み込みに失敗しました: {error}</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-base font-bold text-stone-800">ユーザー管理</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="名前・メール・友達コードで検索"
          className="w-64 rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600"
        />
      </div>

      {!users ? (
        <p className="text-sm text-stone-500">読み込み中…</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-xs text-stone-400">
                  <th className="px-4 py-2 font-medium">表示名</th>
                  <th className="px-4 py-2 font-medium">メール</th>
                  <th className="px-4 py-2 font-medium">友達コード</th>
                  <th className="px-4 py-2 font-medium">チェックイン</th>
                  <th className="px-4 py-2 font-medium">お気に入り</th>
                  <th className="px-4 py-2 font-medium">登録日時</th>
                  <th className="px-4 py-2 font-medium">権限</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className="cursor-pointer hover:bg-stone-50"
                  >
                    <td className="px-4 py-2 font-medium text-stone-800">{u.display_name}</td>
                    <td className="px-4 py-2 text-stone-500">{u.email}</td>
                    <td className="px-4 py-2 font-mono text-xs text-stone-500">{u.friend_code}</td>
                    <td className="px-4 py-2 text-stone-600">{u.checkin_count}</td>
                    <td className="px-4 py-2 text-stone-600">{u.favorite_count}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-stone-500">
                      {new Date(u.created_at).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2">
                      {u.is_admin && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          管理者
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="p-4 text-sm text-stone-500">該当するユーザーがいません。</p>
            )}
          </div>
        </div>
      )}

      {selectedId && (
        <UserDetailDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
