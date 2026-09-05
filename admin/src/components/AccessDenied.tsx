import { useAuth } from '../lib/AuthContext';

export function AccessDenied() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-lg font-bold text-stone-800">アクセス権がありません</h1>
        <p className="mb-6 text-sm text-stone-500">
          {user?.email} は管理者に登録されていません。心当たりがない場合は管理者に連絡してください。
        </p>
        <button
          onClick={() => void signOut()}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
