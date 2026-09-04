import { supabase } from './supabaseClient';

export interface MyProfile {
  id: string;
  displayName: string;
  friendCode: string;
  sharingEnabled: boolean;
}

export interface FriendProfile {
  id: string;
  displayName: string;
}

export interface FriendRequest {
  friendshipId: string;
  profile: FriendProfile;
}

export interface FriendsData {
  friends: FriendRequest[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
}

// Supabase呼び出しは「本当に0件」と「通信/権限エラー」を呼び出し側で区別できるよう、
// 常に{data, error}の形で返す(errorがnullでなければdataは信用しない)。
export interface Result<T> {
  data: T;
  error: string | null;
}

export async function getMyProfile(userId: string): Promise<Result<MyProfile | null>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, friend_code, sharing_enabled')
    .eq('id', userId)
    .single();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  return {
    data: {
      id: data.id,
      displayName: data.display_name,
      friendCode: data.friend_code,
      sharingEnabled: data.sharing_enabled ?? false,
    },
    error: null,
  };
}

export async function setSharingEnabled(userId: string, enabled: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ sharing_enabled: enabled }).eq('id', userId);
  return { error: error?.message ?? null };
}

export async function findProfileByFriendCode(code: string): Promise<FriendProfile | null> {
  const { data, error } = await supabase.rpc('find_profile_by_friend_code', { code: code.trim() });
  if (error || !data || data.length === 0) return null;
  return { id: data[0].id, displayName: data[0].display_name };
}

export async function sendFriendRequest(myId: string, targetId: string): Promise<{ error: string | null }> {
  if (myId === targetId) return { error: '自分自身は追加できません' };
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: myId, addressee_id: targetId, status: 'pending' });
  if (error) {
    if (error.code === '23505') return { error: 'すでに申請済み、または友達です' };
    return { error: error.message };
  }
  return { error: null };
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
}

export async function removeFriendship(friendshipId: string): Promise<void> {
  await supabase.from('friendships').delete().eq('id', friendshipId);
}

export async function loadFriendsData(myId: string): Promise<Result<FriendsData>> {
  const EMPTY: FriendsData = { friends: [], incomingRequests: [], outgoingRequests: [] };
  const { data: rows, error: friendshipsError } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (friendshipsError) return { data: EMPTY, error: friendshipsError.message };

  const friendships = rows ?? [];
  const otherIds = friendships.map((f) => (f.requester_id === myId ? f.addressee_id : f.requester_id));

  if (otherIds.length === 0) return { data: EMPTY, error: null };

  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', otherIds);
  if (profilesError) return { data: EMPTY, error: profilesError.message };
  const profileById = new Map((profileRows ?? []).map((p) => [p.id, { id: p.id, displayName: p.display_name }]));

  const friends: FriendRequest[] = [];
  const incomingRequests: FriendRequest[] = [];
  const outgoingRequests: FriendRequest[] = [];

  for (const f of friendships) {
    const otherId = f.requester_id === myId ? f.addressee_id : f.requester_id;
    const profile = profileById.get(otherId);
    if (!profile) continue;
    const entry: FriendRequest = { friendshipId: f.id, profile };
    if (f.status === 'accepted') {
      friends.push(entry);
    } else if (f.addressee_id === myId) {
      incomingRequests.push(entry);
    } else {
      outgoingRequests.push(entry);
    }
  }

  return { data: { friends, incomingRequests, outgoingRequests }, error: null };
}

// 友達に公開してよい範囲は「訪問済みの駅ID」のみ(訪問日時・タグ・写真有無は含めない)。
// 本人がsharing_enabledをONにしていない限り、DB側(friend_visible_checkinsビュー)が
// そもそも行を返さないため、ここでは取得したIDをそのまま使ってよい。
export async function loadFriendVisitedStationIds(friendId: string): Promise<Result<string[]>> {
  const { data, error } = await supabase
    .from('friend_visible_checkins')
    .select('station_id')
    .eq('user_id', friendId);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []).map((r) => r.station_id), error: null };
}

export async function loadFriendFavorites(friendId: string): Promise<Result<Set<string>>> {
  const { data, error } = await supabase.from('favorites').select('station_id').eq('user_id', friendId);
  if (error) return { data: new Set(), error: error.message };
  return { data: new Set((data ?? []).map((r) => r.station_id)), error: null };
}
