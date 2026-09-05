import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  acceptFriendRequest,
  findProfileByFriendCode,
  getMyProfile,
  loadFriendsData,
  removeFriendship,
  sendFriendRequest,
  setSharingEnabled,
  type FriendsData,
  type MyProfile,
} from '../lib/friends';

const EMPTY: FriendsData = { friends: [], incomingRequests: [], outgoingRequests: [] };

export function useFriends() {
  const { user } = useAuth();
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [friendsData, setFriendsData] = useState<FriendsData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profileResult, dataResult] = await Promise.all([getMyProfile(user.id), loadFriendsData(user.id)]);
      setMyProfile(profileResult.data);
      setFriendsData(dataResult.data);
      // どちらかが通信/権限エラーなら、空表示ではなくエラー表示にする(オフライン時に
      // 「友達がいません」と誤解させないため)
      setError(profileResult.error ?? dataResult.error);
    } catch (e) {
      // getMyProfile/loadFriendsDataは{data,error}を返す設計だが、通信断などでSupabase側の
      // fetch自体が例外を投げるケースがある。ここを捕まえないとloadingがtrueのまま固まり、
      // 「自分の友達コード」が永遠に「読み込み中…」から進まなくなる。
      setError(e instanceof Error ? e.message : '通信エラーが発生しました');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addByCode = useCallback(
    async (code: string): Promise<{ error: string | null }> => {
      if (!user) return { error: 'ログインしていません' };
      const target = await findProfileByFriendCode(code);
      if (!target) return { error: '友達コードが見つかりませんでした' };
      const result = await sendFriendRequest(user.id, target.id);
      if (!result.error) await refresh();
      return result;
    },
    [user, refresh],
  );

  const accept = useCallback(
    async (friendshipId: string) => {
      await acceptFriendRequest(friendshipId);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (friendshipId: string) => {
      await removeFriendship(friendshipId);
      await refresh();
    },
    [refresh],
  );

  const setSharing = useCallback(
    async (enabled: boolean): Promise<{ error: string | null }> => {
      if (!user) return { error: 'ログインしていません' };
      const result = await setSharingEnabled(user.id, enabled);
      if (!result.error) setMyProfile((p) => (p ? { ...p, sharingEnabled: enabled } : p));
      return result;
    },
    [user],
  );

  return { myProfile, friendsData, loading, error, addByCode, accept, remove, setSharing, refresh };
}
