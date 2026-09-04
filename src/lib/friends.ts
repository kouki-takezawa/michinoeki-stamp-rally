import { supabase } from './supabaseClient';
import type { CheckinRecord } from './types';

export interface MyProfile {
  id: string;
  displayName: string;
  friendCode: string;
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

export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, friend_code')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return { id: data.id, displayName: data.display_name, friendCode: data.friend_code };
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

export async function loadFriendsData(myId: string): Promise<FriendsData> {
  const { data: rows } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);

  const friendships = rows ?? [];
  const otherIds = friendships.map((f) => (f.requester_id === myId ? f.addressee_id : f.requester_id));

  if (otherIds.length === 0) return { friends: [], incomingRequests: [], outgoingRequests: [] };

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', otherIds);
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

  return { friends, incomingRequests, outgoingRequests };
}

export async function loadFriendCheckins(friendId: string): Promise<CheckinRecord[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('station_id, checked_in_at, tag, has_photo')
    .eq('user_id', friendId);
  if (error || !data) return [];
  return data.map((r) => ({
    stationId: r.station_id,
    checkedInAt: r.checked_in_at,
    tag: r.tag ?? undefined,
    hasPhoto: r.has_photo ?? false,
  }));
}

export async function loadFriendFavorites(friendId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('favorites').select('station_id').eq('user_id', friendId);
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.station_id));
}
