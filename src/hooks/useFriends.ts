import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  acceptFriendRequest,
  findProfileByFriendCode,
  getMyProfile,
  loadFriendsData,
  removeFriendship,
  sendFriendRequest,
  type FriendsData,
  type MyProfile,
} from '../lib/friends';

const EMPTY: FriendsData = { friends: [], incomingRequests: [], outgoingRequests: [] };

export function useFriends() {
  const { user } = useAuth();
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [friendsData, setFriendsData] = useState<FriendsData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [profile, data] = await Promise.all([getMyProfile(user.id), loadFriendsData(user.id)]);
    setMyProfile(profile);
    setFriendsData(data);
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

  return { myProfile, friendsData, loading, addByCode, accept, remove };
}
