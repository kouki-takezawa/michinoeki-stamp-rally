export interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string;
  friend_code: string;
  is_admin: boolean;
  sharing_enabled: boolean;
  created_at: string;
  checkin_count: number;
  favorite_count: number;
}

export interface AdminUserDetail {
  id: string;
  email: string | null;
  display_name: string;
  friend_code: string;
  is_admin: boolean;
  sharing_enabled: boolean;
  created_at: string;
  station_ids: string[];
  favorite_station_ids: string[];
  friend_count: number;
}

export interface AdminStats {
  total_users: number;
  total_checkins: number;
  total_favorites: number;
  signups_7d: number;
  signups_30d: number;
  pending_friend_requests: number;
}

export interface TopStation {
  station_id: string;
  checkin_count: number;
}

export interface AuditLogEntry {
  id: string;
  admin_display_name: string | null;
  action: string;
  target_user_id: string | null;
  target_display_name: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}
