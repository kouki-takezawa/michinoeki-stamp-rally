-- 道の駅診断・スタンプラリー: 管理画面(admin/)用スキーマ
-- schema.sql適用後、Supabaseダッシュボードの SQL Editor に貼り付けて一度だけ実行してください。
--
-- 設計方針:
-- - 管理画面はservice role keyを一切使わず、通常のログイン(anon key)のみで動く。
-- - 「管理者かどうか」はpublic.profiles.is_adminで判定し、全ての管理操作は
--   SECURITY DEFINER関数(このSQLをSQL Editorで実行するpostgresロール権限で動く)経由に限定する。
--   各関数の先頭でis_admin(auth.uid())を検査するため、一般ユーザーがRPCを直接叩いても弾かれる。
-- - auth.usersの直接操作(email参照・削除)が必要なため、SQL Editor(postgresロール)で
--   実行すること。マイグレーションツール等、権限の弱いロールで実行すると失敗する場合がある。

-- ============================================================
-- 1. 管理者フラグ
-- ============================================================
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- schema.sqlのprofiles_update_ownポリシーは「for update using (id = auth.uid())」のみで
-- with checkの指定がなく、Postgresの仕様上usingの式がそのままwith checkにも使われる。
-- つまり行の所有者チェックしかしておらず、列は一切制限されていない。is_admin列を追加した
-- 直後の状態だと、一般ユーザーが自分のプロフィール行に対して
-- PATCH /rest/v1/profiles?id=eq.<自分のid> { "is_admin": true }
-- を直接叩くだけで自分自身を管理者に昇格できてしまう(RLSは行単位の制御であり列単位では
-- 防げないため)。列単位の権限(GRANT/REVOKE)で塞ぐ。
-- クライアントが直接更新して良いのはsharing_enabledのみ(display_name等はRPC経由に限定する)。
revoke update on public.profiles from authenticated;
grant update (sharing_enabled) on public.profiles to authenticated;

-- ============================================================
-- 2. is_admin() ヘルパー
--    次の監査ログのRLSポリシーがこの関数を参照するため、先に定義しておく必要がある
--    (CREATE POLICYのUSING句は作成時点で関数の存在を解決するため、後回しにすると
--    「function public.is_admin(uuid) does not exist」で失敗する)。
-- ============================================================
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- ============================================================
-- 3. 操作監査ログ(管理者が誰に何をしたかの記録)
--    対象ユーザーが削除されてもログ自体は残したいので、FKはon delete set nullにし、
--    削除時点のemail/display_nameはdetailにスナップショットとして残す。
-- ============================================================
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_audit_log_created on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
drop policy if exists "admin_audit_log_select" on public.admin_audit_log;
create policy "admin_audit_log_select" on public.admin_audit_log
  for select using (public.is_admin(auth.uid()));
-- INSERT/UPDATE/DELETEのポリシーは意図的に用意しない(下記admin_log()経由のみで書き込む)

create or replace function public.admin_log(p_action text, p_target uuid, p_detail jsonb default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_log (admin_id, action, target_user_id, detail)
  values (auth.uid(), p_action, p_target, p_detail);
end;
$$;

-- ============================================================
-- 4. ユーザー一覧(emailはauth.usersにしかないため、admin用RPCでjoinして返す)
-- ============================================================
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  friend_code text,
  is_admin boolean,
  sharing_enabled boolean,
  created_at timestamptz,
  checkin_count bigint,
  favorite_count bigint
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;
  return query
    select
      p.id,
      u.email::text,
      p.display_name,
      p.friend_code,
      p.is_admin,
      p.sharing_enabled,
      p.created_at,
      coalesce(c.cnt, 0) as checkin_count,
      coalesce(f.cnt, 0) as favorite_count
    from public.profiles p
    join auth.users u on u.id = p.id
    left join (select user_id, count(*) cnt from public.checkins group by user_id) c on c.user_id = p.id
    left join (select user_id, count(*) cnt from public.favorites group by user_id) f on f.user_id = p.id
    order by p.created_at desc;
end;
$$;

-- ============================================================
-- 5. ユーザー詳細(訪問済み・お気に入りの道の駅ID一覧を含む)
-- ============================================================
create or replace function public.admin_user_detail(target uuid)
returns table (
  id uuid,
  email text,
  display_name text,
  friend_code text,
  is_admin boolean,
  sharing_enabled boolean,
  created_at timestamptz,
  station_ids text[],
  favorite_station_ids text[],
  friend_count bigint
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;
  return query
    select
      p.id,
      u.email::text,
      p.display_name,
      p.friend_code,
      p.is_admin,
      p.sharing_enabled,
      p.created_at,
      coalesce((
        select array_agg(c.station_id order by c.checked_in_at desc)
        from public.checkins c where c.user_id = p.id
      ), array[]::text[]),
      coalesce((
        select array_agg(fv.station_id)
        from public.favorites fv where fv.user_id = p.id
      ), array[]::text[]),
      (
        select count(*) from public.friendships fr
        where fr.status = 'accepted' and (fr.requester_id = p.id or fr.addressee_id = p.id)
      )
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = target;
end;
$$;

-- ============================================================
-- 6. 管理者権限の付与/剥奪(自分自身の剥奪は禁止して締め出しを防ぐ)
-- ============================================================
create or replace function public.admin_set_is_admin(target uuid, value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;
  if target = auth.uid() and value = false then
    raise exception 'cannot revoke your own admin privileges';
  end if;
  update public.profiles set is_admin = value where id = target;
  perform public.admin_log(case when value then 'grant_admin' else 'revoke_admin' end, target, null);
end;
$$;

-- ============================================================
-- 7. 表示名の変更(不適切な名前のモデレーション用)
-- ============================================================
create or replace function public.admin_update_display_name(target uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;
  if length(trim(new_name)) = 0 or length(new_name) > 40 then
    raise exception 'invalid display name';
  end if;
  select display_name into v_old from public.profiles where id = target;
  update public.profiles set display_name = new_name where id = target;
  perform public.admin_log('update_display_name', target, jsonb_build_object('old_name', v_old, 'new_name', new_name));
end;
$$;

-- ============================================================
-- 8. ユーザー削除(auth.usersごと削除。public側は既存のon delete cascadeで連鎖削除される)
-- ============================================================
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_name text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;
  if target = auth.uid() then
    raise exception 'cannot delete your own account from the admin panel';
  end if;
  select u.email, p.display_name into v_email, v_name
    from auth.users u join public.profiles p on p.id = u.id where u.id = target;
  perform public.admin_log('delete_user', target, jsonb_build_object('email', v_email, 'display_name', v_name));
  delete from auth.users where id = target;
end;
$$;

-- ============================================================
-- 9. ダッシュボード集計
-- ============================================================
create or replace function public.admin_stats()
returns table (
  total_users bigint,
  total_checkins bigint,
  total_favorites bigint,
  signups_7d bigint,
  signups_30d bigint,
  pending_friend_requests bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;
  return query
    select
      (select count(*) from public.profiles),
      (select count(*) from public.checkins),
      (select count(*) from public.favorites),
      (select count(*) from public.profiles where created_at > now() - interval '7 days'),
      (select count(*) from public.profiles where created_at > now() - interval '30 days'),
      (select count(*) from public.friendships where status = 'pending');
end;
$$;

-- ============================================================
-- 10. 人気の道の駅ランキング(チェックイン数)
-- ============================================================
create or replace function public.admin_top_stations(limit_count int default 15)
returns table (station_id text, checkin_count bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;
  return query
    select c.station_id, count(*) as checkin_count
    from public.checkins c
    group by c.station_id
    order by checkin_count desc
    limit limit_count;
end;
$$;

-- ============================================================
-- 11. 監査ログ一覧
-- ============================================================
create or replace function public.admin_audit_log_list(limit_count int default 50)
returns table (
  id uuid,
  admin_display_name text,
  action text,
  target_user_id uuid,
  target_display_name text,
  detail jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;
  return query
    select l.id, ap.display_name, l.action, l.target_user_id, tp.display_name, l.detail, l.created_at
    from public.admin_audit_log l
    left join public.profiles ap on ap.id = l.admin_id
    left join public.profiles tp on tp.id = l.target_user_id
    order by l.created_at desc
    limit limit_count;
end;
$$;

-- ============================================================
-- 12. 権限: PUBLICから剥奪し、ログイン済みユーザーにのみ実行権を付与
--     (各関数内でis_admin()チェックしているので必須ではないが、多層防御として設定)
-- ============================================================
revoke execute on function public.admin_list_users() from public;
revoke execute on function public.admin_user_detail(uuid) from public;
revoke execute on function public.admin_set_is_admin(uuid, boolean) from public;
revoke execute on function public.admin_update_display_name(uuid, text) from public;
revoke execute on function public.admin_delete_user(uuid) from public;
revoke execute on function public.admin_stats() from public;
revoke execute on function public.admin_top_stations(int) from public;
revoke execute on function public.admin_audit_log_list(int) from public;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_user_detail(uuid) to authenticated;
grant execute on function public.admin_set_is_admin(uuid, boolean) to authenticated;
grant execute on function public.admin_update_display_name(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_top_stations(int) to authenticated;
grant execute on function public.admin_audit_log_list(int) to authenticated;

-- ============================================================
-- 13. 初回セットアップ: 最初の管理者を昇格させる
--     自分のメールアドレスに置き換えて、このUPDATE文だけ単独で実行してください。
-- ============================================================
-- update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'your-email@example.com');
