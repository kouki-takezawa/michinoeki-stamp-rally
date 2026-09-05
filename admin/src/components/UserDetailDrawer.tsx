import { useEffect, useState, type ReactNode } from 'react';
import { deleteUser, getUserDetail, setIsAdmin, updateDisplayName } from '../lib/api';
import { stationLabel } from '../lib/stationNames';
import type { AdminUserDetail } from '../lib/types';
import { useAuth } from '../lib/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';

interface UserDetailDrawerProps {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}

type PendingAction = 'delete' | 'promote' | 'demote' | null;

export function UserDetailDrawer({ userId, onClose, onChanged }: UserDetailDrawerProps) {
  const { user: currentUser } = useAuth();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const load = () => {
    getUserDetail(userId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  useEffect(load, [userId]);

  if (error) {
    return (
      <Overlay onClose={onClose}>
        <p className="text-sm text-red-600">読み込みに失敗しました: {error}</p>
      </Overlay>
    );
  }
  if (!detail) {
    return (
      <Overlay onClose={onClose}>
        <p className="text-sm text-stone-500">読み込み中…</p>
      </Overlay>
    );
  }

  const isSelf = detail.id === currentUser?.id;

  const handleRename = async () => {
    await updateDisplayName(detail.id, nameInput.trim());
    setRenaming(false);
    load();
    onChanged();
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="rounded-lg border border-stone-300 px-2 py-1 text-sm outline-none focus:border-emerald-600"
                autoFocus
              />
              <button
                onClick={() => void handleRename()}
                className="text-xs font-semibold text-emerald-700"
              >
                保存
              </button>
              <button onClick={() => setRenaming(false)} className="text-xs text-stone-500">
                取消
              </button>
            </div>
          ) : (
            <h2 className="text-base font-bold text-stone-800">
              {detail.display_name}
              <button
                onClick={() => {
                  setNameInput(detail.display_name);
                  setRenaming(true);
                }}
                className="ml-2 text-xs font-normal text-emerald-700"
              >
                編集
              </button>
            </h2>
          )}
          <p className="text-xs text-stone-500">{detail.email}</p>
        </div>
        {detail.is_admin && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            管理者
          </span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Field label="友達コード" value={detail.friend_code} />
        <Field label="登録日" value={new Date(detail.created_at).toLocaleString('ja-JP')} />
        <Field label="チェックイン数" value={`${detail.station_ids.length}件`} />
        <Field label="お気に入り数" value={`${detail.favorite_station_ids.length}件`} />
        <Field label="友達数" value={`${detail.friend_count}人`} />
        <Field label="訪問共有" value={detail.sharing_enabled ? 'ON' : 'OFF'} />
      </dl>

      {detail.station_ids.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold text-stone-500">最近のチェックイン</p>
          <ul className="max-h-32 overflow-y-auto rounded-lg bg-stone-50 p-2 text-xs text-stone-600">
            {detail.station_ids.slice(0, 20).map((id, i) => (
              <li key={`${id}-${i}`} className="py-0.5">
                {stationLabel(id)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
        {detail.is_admin ? (
          <button
            disabled={isSelf}
            title={isSelf ? '自分自身の管理者権限は剥奪できません' : undefined}
            onClick={() => setPendingAction('demote')}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-40"
          >
            管理者権限を外す
          </button>
        ) : (
          <button
            onClick={() => setPendingAction('promote')}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700"
          >
            管理者にする
          </button>
        )}
        <button
          disabled={isSelf}
          title={isSelf ? '自分自身は削除できません' : undefined}
          onClick={() => setPendingAction('delete')}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-40"
        >
          アカウントを削除
        </button>
      </div>

      {pendingAction === 'delete' && (
        <ConfirmDialog
          title="アカウントを削除しますか？"
          message={`${detail.display_name} (${detail.email}) のアカウントを完全に削除します。チェックイン・お気に入り・友達関係もすべて削除され、元に戻せません。`}
          confirmLabel="削除する"
          danger
          requireText={detail.display_name}
          onCancel={() => setPendingAction(null)}
          onConfirm={async () => {
            await deleteUser(detail.id);
            setPendingAction(null);
            onChanged();
            onClose();
          }}
        />
      )}
      {pendingAction === 'promote' && (
        <ConfirmDialog
          title="管理者にしますか？"
          message={`${detail.display_name} をこの管理画面にログインできる管理者にします。`}
          confirmLabel="管理者にする"
          onCancel={() => setPendingAction(null)}
          onConfirm={async () => {
            await setIsAdmin(detail.id, true);
            setPendingAction(null);
            load();
            onChanged();
          }}
        />
      )}
      {pendingAction === 'demote' && (
        <ConfirmDialog
          title="管理者権限を外しますか？"
          message={`${detail.display_name} は管理画面にログインできなくなります。`}
          confirmLabel="外す"
          danger
          onCancel={() => setPendingAction(null)}
          onConfirm={async () => {
            await setIsAdmin(detail.id, false);
            setPendingAction(null);
            load();
            onChanged();
          }}
        />
      )}
    </Overlay>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className="text-stone-700">{value}</dd>
    </div>
  );
}

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
