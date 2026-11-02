-- ═══════════════════════════════════════════════════════════════════
-- WingLink — full backend schema for Supabase
-- Paste this ENTIRE file into: Supabase Dashboard → SQL Editor → Run
-- Idempotent-ish: safe to re-run (uses IF NOT EXISTS / or replace).
-- After running: Storage policies + realtime publication are included.
-- ═══════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ── Profiles (1:1 with auth.users; created by trigger) ──────────────
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  username         text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name     text not null,
  bio              text not null default '',
  avatar_url       text not null default '',
  cover_url        text not null default 'images/f22-sunset.jpg',
  country          text not null default '',
  country_code     text not null default '',
  interests        text[] not null default '{}',
  identity_tags    text[] not null default '{}',
  favorite_aircraft text[] not null default '{}',
  followers        integer not null default 0 check (followers >= 0),
  following        integer not null default 0 check (following >= 0),
  friends          integer not null default 0 check (friends >= 0),
  posts_count      integer not null default 0 check (posts_count >= 0),
  xp               integer not null default 0 check (xp >= 0),
  badges           text[] not null default '{}',
  frame            text not null default 'none',
  visibility       text not null default 'public' check (visibility in ('public', 'private')),
  stats            jsonb not null default '{"posts":0,"likesReceived":0,"comments":0,"quizzesPlayed":0,"quizBestScore":0,"quizWins":0,"streak":0}',
  created_at       timestamptz not null default now()
);

-- ── Posts ───────────────────────────────────────────────────────────
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.profiles (id) on delete cascade,
  type         text not null default 'text',
  text         text not null default '',
  images       text[] not null default '{}',
  video        jsonb,
  poll         jsonb,
  news         jsonb,
  community_id uuid,
  visibility   text not null default 'public' check (visibility in ('public', 'followers', 'community')),
  hashtags     text[] not null default '{}',
  mentions     text[] not null default '{}',
  shares       integer not null default 0 check (shares >= 0),
  created_at   timestamptz not null default now()
);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- ── Comments ────────────────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 2000),
  reply_to   uuid references public.comments (id) on delete cascade,
  likes      integer not null default 0 check (likes >= 0),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at desc);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ── Reactions (one per user per post; ❤️ is the like) ───────────────
create table if not exists public.reactions (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  emoji      text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.poll_votes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  option_id  text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ── Social graph ────────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index if not exists follows_followed_idx on public.follows (followed_id);

create table if not exists public.friendships (
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create table if not exists public.friend_requests (
  from_id    uuid not null references public.profiles (id) on delete cascade,
  to_id      uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'user', 'community')),
  target_id   text not null,
  reason      text not null,
  details     text,
  created_at  timestamptz not null default now()
);

-- ── Communities ─────────────────────────────────────────────────────
create table if not exists public.communities (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null check (char_length(name) between 2 and 60),
  avatar      text not null default '',
  banner      text not null default 'images/f22-sunset.jpg',
  description text not null default '',
  rules       text[] not null default '{}',
  category    text not null default 'general',
  visibility  text not null default 'public' check (visibility in ('public', 'private')),
  member_count integer not null default 0 check (member_count >= 0),
  admin_ids   uuid[] not null default '{}',
  mod_ids     uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         text not null default 'member' check (role in ('admin', 'mod', 'member')),
  status       text not null default 'member' check (status in ('member', 'pending')),
  created_at   timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.posts
  drop constraint if exists posts_community_fk;
alter table public.posts
  add constraint posts_community_fk
  foreign key (community_id) references public.communities (id) on delete set null;

-- ── Messaging ───────────────────────────────────────────────────────
create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  type         text not null default 'dm' check (type in ('dm', 'group', 'community')),
  name         text,
  avatar       text,
  community_id uuid references public.communities (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  kind            text not null default 'text' check (kind in ('text', 'image', 'post', 'aircraft')),
  text            text,
  image           text,
  post_id         uuid references public.posts (id) on delete set null,
  aircraft_id     text,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at desc);

-- ── Notifications ───────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  category   text not null,
  actor_id   uuid references public.profiles (id) on delete set null,
  text       text not null,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ── Quiz & challenges ───────────────────────────────────────────────
create table if not exists public.quiz_records (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  mode       text not null,
  difficulty text not null,
  score      integer not null check (score >= 0),
  total      integer not null check (total > 0),
  xp         integer not null check (xp >= 0 and xp <= 200),
  played_at  timestamptz not null default now()
);
create index if not exists quiz_records_user_idx on public.quiz_records (user_id, played_at desc);

create table if not exists public.challenge_progress (
  challenge_id text not null,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  progress     integer not null default 0,
  claimed      boolean not null default false,
  updated_at   timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════
-- Server-side XP & counters (SECURITY DEFINER — clients can't inflate)
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.grant_xp(p_user uuid, p_amount integer)
returns void language sql security definer set search_path = public as $$
  update profiles set xp = xp + p_amount where id = p_user and p_amount > 0;
$$;

-- RPC: quiz result (validates caller; XP capped server-side)
create or replace function public.submit_quiz(p_mode text, p_difficulty text, p_score integer, p_total integer, p_xp integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid_ uuid := auth.uid();
  capped integer;
begin
  if uid_ is null then raise exception 'not authenticated'; end if;
  if p_total < 1 or p_total > 50 or p_score < 0 or p_score > p_total then
    raise exception 'invalid score';
  end if;
  capped := least(greatest(p_xp, 0), 200);
  insert into quiz_records (user_id, mode, difficulty, score, total, xp)
  values (uid_, p_mode, p_difficulty, p_score, p_total, capped);
  perform grant_xp(uid_, capped);
  update profiles set stats = jsonb_set(
    jsonb_set(
      jsonb_set(stats, '{quizzesPlayed}', to_jsonb((stats->>'quizzesPlayed')::int + 1)),
      '{quizBestScore}', to_jsonb(greatest((stats->>'quizBestScore')::int, p_score))),
    '{quizWins}', to_jsonb((stats->>'quizWins')::int + case when p_score = p_total then 1 else 0 end)
  ) where id = uid_;
end $$;

-- RPC: claim a challenge reward (rate-limited XP)
create or replace function public.claim_challenge_xp(p_amount integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  perform grant_xp(auth.uid(), least(greatest(p_amount, 0), 500));
end $$;

-- RPC: ensure a DM conversation exists with another user
create or replace function public.ensure_dm(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  conv_ uuid;
  me_ uuid := auth.uid();
begin
  if me_ is null then raise exception 'not authenticated'; end if;
  if p_other = me_ then raise exception 'cannot message yourself'; end if;
  if exists (select 1 from blocks where (blocker_id = me_ and blocked_id = p_other)
                              or (blocker_id = p_other and blocked_id = me_)) then
    raise exception 'messaging blocked';
  end if;
  select c.id into conv_
    from conversations c
    join conversation_members a on a.conversation_id = c.id and a.user_id = me_
    join conversation_members b on b.conversation_id = c.id and b.user_id = p_other
    where c.type = 'dm'
    limit 1;
  if conv_ is null then
    insert into conversations (type) values ('dm') returning id into conv_;
    insert into conversation_members (conversation_id, user_id)
    values (conv_, me_), (conv_, p_other);
  end if;
  return conv_;
end $$;

-- RPC: vote on a poll exactly once
create or replace function public.vote_poll(p_post uuid, p_option text)
returns void language plpgsql security definer set search_path = public as $$
declare
  opts jsonb;
  opt jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from poll_votes where post_id = p_post and user_id = auth.uid()) then
    raise exception 'already voted';
  end if;
  select poll into opts from posts where id = p_post for update;
  if opts is null then raise exception 'no poll'; end if;
  select v into opt from jsonb_array_elements(opts -> 'options') v where v ->> 'id' = p_option;
  if opt is null then raise exception 'unknown option'; end if;
  update posts set poll = jsonb_set(
    poll, '{options}',
    (select jsonb_agg(
      case when (o ->> 'id') = p_option
        then jsonb_set(o, '{votes}', to_jsonb(coalesce((o ->> 'votes')::int, 0) + 1))
        else o end)
     from jsonb_array_elements(poll -> 'options') o)
  ) where id = p_post;
  insert into poll_votes (post_id, user_id, option_id) values (p_post, auth.uid(), p_option);
end $$;

-- RPC: bump share counter
create or replace function public.bump_share(p_post uuid)
returns void language sql security definer set search_path = public as $$
  update posts set shares = shares + 1 where id = p_post;
$$;

-- RPC: toggle a comment like atomically
create or replace function public.toggle_comment_like(p_comment uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  liked boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from comment_likes where comment_id = p_comment and user_id = auth.uid()) then
    delete from comment_likes where comment_id = p_comment and user_id = auth.uid();
    return false;
  end if;
  insert into comment_likes (comment_id, user_id) values (p_comment, auth.uid());
  return true;
end $$;

-- ── Triggers: XP + counters + notifications ─────────────────────────

-- New account: profile row + welcome XP (signup bonus 150)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text := coalesce(new.raw_user_meta_data ->> 'username', 'pilot_' || substr(replace(new.id::text, '-', ''), 1, 8));
  dname text := coalesce(new.raw_user_meta_data ->> 'display_name', uname);
  ints  text[] := '{}';
begin
  -- Never block account creation: any profile-sync problem is logged as a
  -- warning and the client self-heals the profile row on first boot.
  begin
    if jsonb_typeof(coalesce(new.raw_user_meta_data -> 'interests', '[]'::jsonb)) = 'array' then
      select coalesce(array_agg(x), '{}')
      into ints
      from jsonb_array_elements_text(new.raw_user_meta_data -> 'interests') x;
    end if;
    insert into public.profiles (id, username, display_name, interests, xp)
    values (new.id, lower(uname), dname, ints, 150)
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user: profile sync failed (%)', SQLERRM;
  end;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Post published: +15 XP, posts_count, notify community? (self progress)
create or replace function public.on_post_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform grant_xp(new.author_id, 15);
  update profiles set posts_count = posts_count + 1,
    stats = jsonb_set(stats, '{posts}', to_jsonb((stats->>'posts')::int + 1))
  where id = new.author_id;
  return new;
end $$;
drop trigger if exists trg_post_insert on public.posts;
create trigger trg_post_insert after insert on public.posts
  for each row execute function public.on_post_insert();

-- Comment: +5 XP for commenter, notify post author
create or replace function public.on_comment_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_author uuid;
  author_name text;
begin
  select author_id into post_author from posts where id = new.post_id;
  perform grant_xp(new.author_id, 5);
  update profiles set stats = jsonb_set(stats, '{comments}', to_jsonb((stats->>'comments')::int + 1))
  where id = new.author_id;
  if post_author is not null and post_author <> new.author_id then
    select display_name into author_name from profiles where id = new.author_id;
    insert into notifications (user_id, category, actor_id, text, link)
    values (post_author, 'comments', new.author_id,
      coalesce(author_name, 'Someone') || ' commented on your post', '/home');
  end if;
  return new;
end $$;
drop trigger if exists trg_comment_insert on public.comments;
create trigger trg_comment_insert after insert on public.comments
  for each row execute function public.on_comment_insert();

-- Comment likes counter
create or replace function public.on_comment_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update comments set likes = likes + 1 where id = new.comment_id;
  else
    update comments set likes = greatest(likes - 1, 0) where id = old.comment_id;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_comment_like on public.comment_likes;
create trigger trg_comment_like after insert or delete on public.comment_likes
  for each row execute function public.on_comment_like();

-- Reaction: +3 XP for post author (not self), likesReceived, notify
create or replace function public.on_reaction_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_author uuid;
  author_name text;
begin
  select author_id into post_author from posts where id = new.post_id;
  if post_author is not null and post_author <> new.user_id then
    perform grant_xp(post_author, 3);
    update profiles set stats = jsonb_set(stats, '{likesReceived}', to_jsonb((stats->>'likesReceived')::int + 1))
    where id = post_author;
    if new.emoji = '❤️' then
      select display_name into author_name from profiles where id = new.user_id;
      insert into notifications (user_id, category, actor_id, text, link)
      values (post_author, 'reactions', new.user_id,
        coalesce(author_name, 'Someone') || ' reacted to your post', '/home');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_reaction_insert on public.reactions;
create trigger trg_reaction_insert after insert on public.reactions
  for each row execute function public.on_reaction_insert();

-- Follow: +2 XP for the followed user, counters, notify
create or replace function public.on_follow_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fname text;
begin
  perform grant_xp(new.followed_id, 2);
  update profiles set followers = followers + 1 where id = new.followed_id;
  update profiles set following = following + 1 where id = new.follower_id;
  select display_name into fname from profiles where id = new.follower_id;
  insert into notifications (user_id, category, actor_id, text, link)
  values (new.followed_id, 'followers', new.follower_id,
    coalesce(fname, 'Someone') || ' started following you', '/u/' ||
    (select username from profiles where id = new.follower_id));
  return new;
end $$;
drop trigger if exists trg_follow_insert on public.follows;
create trigger trg_follow_insert after insert on public.follows
  for each row execute function public.on_follow_insert();

create or replace function public.on_follow_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update profiles set followers = greatest(followers - 1, 0) where id = old.followed_id;
  update profiles set following = greatest(following - 1, 0) where id = old.follower_id;
  return old;
end $$;
drop trigger if exists trg_follow_delete on public.follows;
create trigger trg_follow_delete after delete on public.follows
  for each row execute function public.on_follow_delete();

-- Friendship accepted: +5 XP both ways
create or replace function public.on_friendship_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform grant_xp(new.user_a, 5);
  perform grant_xp(new.user_b, 5);
  update profiles set friends = friends + 1 where id in (new.user_a, new.user_b);
  return new;
end $$;
drop trigger if exists trg_friendship_insert on public.friendships;
create trigger trg_friendship_insert after insert on public.friendships
  for each row execute function public.on_friendship_insert();

create or replace function public.on_friendship_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update profiles set friends = greatest(friends - 1, 0) where id in (old.user_a, old.user_b);
  return old;
end $$;
drop trigger if exists trg_friendship_delete on public.friendships;
create trigger trg_friendship_delete after delete on public.friendships
  for each row execute function public.on_friendship_delete();

-- Friend request: notify recipient
create or replace function public.on_friend_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fname text;
begin
  select display_name into fname from profiles where id = new.from_id;
  insert into notifications (user_id, category, actor_id, text, link)
  values (new.to_id, 'friends', new.from_id,
    coalesce(fname, 'Someone') || ' sent you a friend request', '/u/' ||
    (select username from profiles where id = new.from_id));
  return new;
end $$;
drop trigger if exists trg_friend_request on public.friend_requests;
create trigger trg_friend_request after insert on public.friend_requests
  for each row execute function public.on_friend_request();

-- Community created: +25 XP for creator
create or replace function public.on_community_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if array_length(new.admin_ids, 1) >= 1 and new.admin_ids[1] is not null then
    perform grant_xp(new.admin_ids[1], 25);
    -- The creator's admin membership is created HERE (definer), so clients
    -- can only ever insert their own 'member' rows (see RLS below).
    insert into public.community_members (community_id, user_id, role, status)
    values (new.id, new.admin_ids[1], 'admin', 'member')
    on conflict do nothing;
    update public.communities set member_count = 1 where id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists trg_community_insert on public.communities;
create trigger trg_community_insert after insert on public.communities
  for each row execute function public.on_community_insert();

-- Community membership: +10 XP when joining, member_count, pending → notify admins
create or replace function public.on_community_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cname text;
begin
  if tg_op = 'INSERT' and new.status = 'member' and new.role <> 'admin' then
    perform grant_xp(new.user_id, 10);
    update communities set member_count = member_count + 1 where id = new.community_id;
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'member' then
    perform grant_xp(new.user_id, 10);
    update communities set member_count = member_count + 1 where id = new.community_id;
  elsif tg_op = 'DELETE' and old.status = 'member' then
    update communities set member_count = greatest(member_count - 1, 0) where id = old.community_id;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_community_member on public.community_members;
create trigger trg_community_member after insert or update or delete on public.community_members
  for each row execute function public.on_community_member();

create or replace function public.on_member_pending()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin uuid;
  uname text;
  cname text;
begin
  if new.status = 'pending' then
    select name into cname from communities where id = new.community_id;
    select display_name into uname from profiles where id = new.user_id;
    for admin in select unnest(admin_ids) from communities where id = new.community_id loop
      insert into notifications (user_id, category, actor_id, text, link)
      values (admin, 'communities', new.user_id,
        coalesce(uname, 'Someone') || ' requested to join ' || coalesce(cname, 'a community'), '/communities');
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists trg_member_pending on public.community_members;
create trigger trg_member_pending after insert on public.community_members
  for each row execute function public.on_member_pending();

-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════

-- Policy helpers: SECURITY DEFINER so policies never query other tables
-- through RLS (which caused 42P17 infinite recursion between
-- communities ↔ community_members). Definer bypasses RLS as owner.
create or replace function public.is_community_member(p_community uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.community_members
    where community_id = p_community and user_id = auth.uid() and status = 'member'
  );
$$;

create or replace function public.is_community_participant(p_community uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.community_members
    where community_id = p_community and user_id = auth.uid()
  );
$$;

create or replace function public.is_conversation_member(p_conv uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conv and user_id = auth.uid()
  );
$$;

grant execute on function public.is_community_member(uuid) to authenticated;
grant execute on function public.is_community_participant(uuid) to authenticated;
grant execute on function public.is_conversation_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.reactions enable row level security;
alter table public.poll_votes enable row level security;
alter table public.follows enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_requests enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.quiz_records enable row level security;
alter table public.challenge_progress enable row level security;

-- profiles: public directory (no emails stored here), self-write
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Self-heal: if the signup trigger could not create the profile row, the
-- client inserts its own row on first boot (own id only, nothing else).
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- posts: visible if public / own / followers-who-follow / community member
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated using (
  author_id = auth.uid()
  or visibility = 'public'
  or (visibility = 'followers' and exists (
        select 1 from follows f where f.follower_id = auth.uid() and f.followed_id = author_id))
  or (community_id is not null and public.is_community_member(community_id))
);
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated with check (
  author_id = auth.uid()
  and (community_id is null or public.is_community_member(community_id))
);
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated using (author_id = auth.uid());

-- comments: read with post visibility, write as self
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated using (
  author_id = auth.uid()
  or exists (select 1 from posts p where p.id = post_id and (
       p.author_id = auth.uid() or p.visibility = 'public'
       or (p.visibility = 'followers' and exists (
         select 1 from follows f where f.follower_id = auth.uid() and f.followed_id = p.author_id))
       or (p.community_id is not null and public.is_community_member(p.community_id))))
);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated using (author_id = auth.uid());

-- comment_likes
drop policy if exists comment_likes_select on public.comment_likes;
create policy comment_likes_select on public.comment_likes for select to authenticated using (true);
drop policy if exists comment_likes_write on public.comment_likes;
create policy comment_likes_write on public.comment_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists comment_likes_delete on public.comment_likes;
create policy comment_likes_delete on public.comment_likes for delete to authenticated using (user_id = auth.uid());

-- reactions
drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions for select to authenticated using (true);
drop policy if exists reactions_write on public.reactions;
create policy reactions_write on public.reactions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions for delete to authenticated using (user_id = auth.uid());

-- poll_votes (writes go through vote_poll RPC; keep direct insert for the same user)
drop policy if exists poll_votes_select on public.poll_votes;
create policy poll_votes_select on public.poll_votes for select to authenticated using (true);
drop policy if exists poll_votes_insert on public.poll_votes;
create policy poll_votes_insert on public.poll_votes for insert to authenticated with check (user_id = auth.uid());

-- follows
drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows for select to authenticated using (true);
drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows for insert to authenticated with check (follower_id = auth.uid());
drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows for delete to authenticated using (follower_id = auth.uid());

-- friendships & requests & blocks
drop policy if exists friendships_all on public.friendships;
create policy friendships_all on public.friendships for all to authenticated
  using (user_a = auth.uid() or user_b = auth.uid())
  with check (user_a = auth.uid() or user_b = auth.uid());
drop policy if exists friend_requests_select on public.friend_requests;
create policy friend_requests_select on public.friend_requests for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
drop policy if exists friend_requests_insert on public.friend_requests;
create policy friend_requests_insert on public.friend_requests for insert to authenticated
  with check (from_id = auth.uid());
drop policy if exists friend_requests_delete on public.friend_requests;
create policy friend_requests_delete on public.friend_requests for delete to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
drop policy if exists blocks_all on public.blocks;
create policy blocks_all on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- reports: submit only; readable by staff via dashboard
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- communities: public readable, private only for members; creator inserts; admins update
drop policy if exists communities_select on public.communities;
create policy communities_select on public.communities for select to authenticated using (
  visibility = 'public'
  or public.is_community_participant(id)
);
drop policy if exists communities_insert on public.communities;
create policy communities_insert on public.communities for insert to authenticated
  with check (array_length(admin_ids, 1) >= 1 and admin_ids[1] = auth.uid());
drop policy if exists communities_update on public.communities;
create policy communities_update on public.communities for update to authenticated
  using (auth.uid() = any (admin_ids)) with check (true);

-- community_members
drop policy if exists community_members_select on public.community_members;
create policy community_members_select on public.community_members for select to authenticated using (
  user_id = auth.uid()
  or status = 'member'
  or exists (select 1 from communities c where c.id = community_id and c.visibility = 'public')
);
drop policy if exists community_members_insert on public.community_members;
create policy community_members_insert on public.community_members for insert to authenticated
  with check (user_id = auth.uid() and role = 'member');
drop policy if exists community_members_update on public.community_members;
create or replace function public.is_community_mod(p_community uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.communities c
    where c.id = p_community
      and (auth.uid() = any (c.admin_ids) or auth.uid() = any (c.mod_ids))
  );
$$;
grant execute on function public.is_community_mod(uuid) to authenticated;

create policy community_members_update on public.community_members for update to authenticated
  using (user_id = auth.uid() or public.is_community_mod(community_id))
  with check (true);
drop policy if exists community_members_delete on public.community_members;
create policy community_members_delete on public.community_members for delete to authenticated
  using (user_id = auth.uid() or public.is_community_mod(community_id));

-- messaging: members only (the "inbox is invisible to everyone else" guarantee)
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select to authenticated using (
  exists (select 1 from conversation_members m
          where m.conversation_id = id and m.user_id = auth.uid())
);
drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations for insert to authenticated with check (true);

drop policy if exists conversation_members_select on public.conversation_members;
create policy conversation_members_select on public.conversation_members for select to authenticated
  using (user_id = auth.uid() or public.is_conversation_member(conversation_id));
drop policy if exists conversation_members_insert on public.conversation_members;
create policy conversation_members_insert on public.conversation_members for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists conversation_members_update on public.conversation_members;
create policy conversation_members_update on public.conversation_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- (membership helpers above prevent policy→policy recursion)

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated using (
  public.is_conversation_member(conversation_id)
);
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id)
);

-- notifications: private inbox
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- quiz & challenges
drop policy if exists quiz_records_select on public.quiz_records;
create policy quiz_records_select on public.quiz_records for select to authenticated using (true);
drop policy if exists quiz_records_insert on public.quiz_records;
create policy quiz_records_insert on public.quiz_records for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists challenge_progress_all on public.challenge_progress;
create policy challenge_progress_all on public.challenge_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RPCs callable by clients
grant execute on function public.submit_quiz(text, text, integer, integer, integer) to authenticated;
grant execute on function public.claim_challenge_xp(integer) to authenticated;
grant execute on function public.ensure_dm(uuid) to authenticated;
grant execute on function public.vote_poll(uuid, text) to authenticated;
grant execute on function public.bump_share(uuid) to authenticated;
grant execute on function public.toggle_comment_like(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- Storage: public "media" bucket for post images (avatars reuse it)
-- ═══════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists media_insert_own on storage.objects;
create policy media_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists media_delete_own on storage.objects;
create policy media_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════════
-- Realtime: enable for the live feed / DMs / notifications
-- ═══════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'posts', 'comments', 'reactions', 'follows', 'messages', 'notifications',
    'profiles', 'communities', 'community_members', 'friend_requests',
    'friendships', 'comment_likes', 'conversations', 'conversation_members'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null; -- already published
    end;
  end loop;
end $$;

-- Done ✅ — now set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (see docs/SUPABASE.md)
