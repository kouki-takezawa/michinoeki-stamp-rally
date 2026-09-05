import { useEffect, useState } from 'react';
import { getAuditLog } from '../lib/api';
import type { AuditLogEntry } from '../lib/types';

const ACTION_LABEL: Record<string, string> = {
  grant_admin: '管理者権限を付与',
  revoke_admin: '管理者権限を剥奪',
  update_display_name: '表示名を変更',
  delete_user: 'アカウントを削除',
};

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAuditLog(100)
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) return <p className="text-sm text-red-600">読み込みに失敗しました: {error}</p>;
  if (!entries) return <p className="text-sm text-stone-500">読み込み中…</p>;

  return (
    <div>
      <h1 className="mb-4 text-base font-bold text-stone-800">操作ログ</h1>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {entries.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">まだ操作履歴がありません。</p>
        ) : (
          <ul className="divide-y divide-stone-50">
            {entries.map((e) => (
              <li key={e.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-800">
                    {ACTION_LABEL[e.action] ?? e.action}
                  </span>
                  <span className="text-xs text-stone-400">
                    {new Date(e.created_at).toLocaleString('ja-JP')}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-500">
                  実行者: {e.admin_display_name ?? '(削除済みアカウント)'}
                  {e.target_display_name && <> / 対象: {e.target_display_name}</>}
                </p>
                {e.detail && Object.keys(e.detail).length > 0 && (
                  <p className="mt-0.5 font-mono text-xs text-stone-400">
                    {JSON.stringify(e.detail)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
