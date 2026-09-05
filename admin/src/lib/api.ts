import { supabase } from './supabaseClient';
import type { AdminStats, AdminUserDetail, AdminUserRow, AuditLogEntry, TopStation } from './types';

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('no data returned');
  return result.data;
}

export async function listUsers(): Promise<AdminUserRow[]> {
  return unwrap(await supabase.rpc('admin_list_users'));
}

export async function getUserDetail(id: string): Promise<AdminUserDetail | null> {
  const { data, error } = await supabase.rpc('admin_user_detail', { target: id });
  if (error) throw new Error(error.message);
  const rows = data as AdminUserDetail[] | null;
  return rows && rows.length > 0 ? rows[0] : null;
}

export async function setIsAdmin(id: string, value: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_is_admin', { target: id, value });
  if (error) throw new Error(error.message);
}

export async function updateDisplayName(id: string, newName: string): Promise<void> {
  const { error } = await supabase.rpc('admin_update_display_name', { target: id, new_name: newName });
  if (error) throw new Error(error.message);
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { target: id });
  if (error) throw new Error(error.message);
}

export async function getStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('admin_stats');
  if (error) throw new Error(error.message);
  const rows = data as AdminStats[] | null;
  if (!rows || rows.length === 0) throw new Error('no stats returned');
  return rows[0];
}

export async function getTopStations(limitCount = 15): Promise<TopStation[]> {
  return unwrap(await supabase.rpc('admin_top_stations', { limit_count: limitCount }));
}

export async function getAuditLog(limitCount = 50): Promise<AuditLogEntry[]> {
  return unwrap(await supabase.rpc('admin_audit_log_list', { limit_count: limitCount }));
}
