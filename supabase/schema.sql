-- 道の駅診断・スタンプラリー: ログイン・友達機能用スキーマ
-- Supabaseダッシュボードの SQL Editor に貼り付けて一度だけ実行してください。

-- ============================================================
-- 1. profiles: auth.usersに1:1で紐づく公開プロフィール
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  friend_code text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. checkins: チェックイン履歴（従来のlocalStorage相当）
-- ============================================================
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  station_id text not null,
  checked_in_at timestamptz not null,
  tag text,
  has_photo boolean not null default false,
  unique (user_id, station_id)
);
create index if not exists idx_checkins_user on public.checkins (user_id);

-- ============================================================
-- 3. favorites: お気に入り
-- ============================================================
create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  station_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, station_id)
);

-- ============================================================
-- 4. friendships: 友達関係（申請中/承認済み）
-- ============================================================
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index if not exists idx_friendships_requester on public.friendships (requester_id);
create index if not exists idx_friendships_addressee on public.friendships (addressee_id);

-- ============================================================
-- 5. 友達コードの自動生成 + 新規ユーザー時のプロフィール自動作成
-- ============================================================
create or replace function public.generate_friend_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 0/O/1/Iなど紛らわしい文字は除外
  code text := '';
  i int;
begin
  for i in 1..7 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return code;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_code text;
begin
  loop
    new_code := public.generate_friend_code();
    exit when not exists (select 1 from public.profiles where friend_code = new_code);
  end loop;
  insert into public.profiles (id, display_name, friend_code)
  values (new.id, split_part(new.email, '@', 1), new_code);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 6. 友達コードから相手を検索するRPC（プロフィール非公開のままでも検索できるように）
-- ============================================================
create or replace function public.find_profile_by_friend_code(code text)
returns table (id uuid, display_name text)
language sql
security definer set search_path = public
stable
as $$
  select p.id, p.display_name from public.profiles p where p.friend_code = upper(code);
$$;

-- ============================================================
-- 7. 「承認済み友達かどうか」判定ヘルパー
-- ============================================================
create or replace function public.is_friend_with(target_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = target_id)
        or (f.addressee_id = auth.uid() and f.requester_id = target_id)
      )
  );
$$;

-- ============================================================
-- 8. Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.checkins enable row level security;
alter table public.favorites enable row level security;
alter table public.friendships enable row level security;

-- profiles: 自分・承認済み友達・申請中の相手のみ閲覧可
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_friend_with(id)
    or exists (
      select 1 from public.friendships f
      where f.status = 'pending'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = id)
          or (f.addressee_id = auth.uid() and f.requester_id = id)
        )
    )
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- checkins: 自分の全操作 + 承認済み友達は閲覧のみ
drop policy if exists "checkins_select" on public.checkins;
create policy "checkins_select" on public.checkins
  for select using (user_id = auth.uid() or public.is_friend_with(user_id));

drop policy if exists "checkins_insert_own" on public.checkins;
create policy "checkins_insert_own" on public.checkins
  for insert with check (user_id = auth.uid());

drop policy if exists "checkins_update_own" on public.checkins;
create policy "checkins_update_own" on public.checkins
  for update using (user_id = auth.uid());

drop policy if exists "checkins_delete_own" on public.checkins;
create policy "checkins_delete_own" on public.checkins
  for delete using (user_id = auth.uid());

-- favorites: checkinsと同様
drop policy if exists "favorites_select" on public.favorites;
create policy "favorites_select" on public.favorites
  for select using (user_id = auth.uid() or public.is_friend_with(user_id));

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
  for insert with check (user_id = auth.uid());

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
  for delete using (user_id = auth.uid());

-- friendships: 当事者のみ閲覧・作成・更新・削除可
drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships
  for insert with check (requester_id = auth.uid());

drop policy if exists "friendships_update" on public.friendships;
create policy "friendships_update" on public.friendships
  for update using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());
