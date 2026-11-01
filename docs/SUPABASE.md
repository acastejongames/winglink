# Connecting Supabase — WingLink

WingLink runs fully client-side today (encrypted local vault). This is the
fastest path to a **real, multi-user network** with Supabase. Estimated
effort is listed per phase — do them in order; each phase ships working
software.

## 0. Create the project (5 min)

1. Create a free project at [supabase.com](https://supabase.com).
2. From **Project Settings → API** copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`
3. Create `.env.local` (never commit it — `.env*` is already gitignored):

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

4. `npm i @supabase/supabase-js` and create `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
)
```

## 1. Auth (half a day) — replace the local sign-in

- Turn on **Email + Password** in Authentication → Providers.
- In `src/lib/store.tsx` swap the two auth functions:
  - `signUp` → `supabase.auth.signUp({ email, password, options: { data: { username, display_name } } })`
  - `signIn` → `supabase.auth.signInWithPassword({ email, password })`
  - Subscribe once: `supabase.auth.onAuthStateChange(...)` → set/clear
    `authUserId` from `supabase.auth.getSession()`.
- Keep the local vault ONLY as an optional extra (e.g. encrypting DMs
  client-side later). Server-side auth + RLS becomes the source of truth.
- Profiles: upsert a `profiles` row on first sign-in trigger
  (`auth.users` → `profiles` via SQL trigger, simplest and safe).

## 2. Posts & feed (1–2 days)

Table (RLS: public read, author write):

```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'text',
  text text not null default '',
  images jsonb not null default '[]',
  visibility text not null default 'public',
  community_id uuid,
  hashtags jsonb not null default '[]',
  likes int not null default 0,
  created_at timestamptz not null default now()
);
alter table posts enable row level security;
create policy "public read" on posts for select using (true);
create policy "author write" on posts for insert with check (auth.uid() = author_id);
create policy "author edit" on posts for update using (auth.uid() = author_id);
create policy "author delete" on posts for delete using (auth.uid() = author_id);
```

- In the store: `addPost` → `supabase.from('posts').insert(...)`, load the
  feed with `select('*').order('created_at', { ascending: false })`.
- Same pattern for `comments`, `reactions`, `follows`, `communities`,
  `community_members`, `notifications`.

## 3. Media (half a day)

- Create a public **Storage bucket** `media`.
- Replace `fileToCompressedDataUrl` uploads with
  `supabase.storage.from('media').upload(\`posts/${uuid}.jpg\`, file)` and
  store the returned public URL in `images[]`. This also shrinks your
  localStorage vault (photos no longer base64).

## 4. Messaging + realtime (1 day)

- Tables `conversations`, `conversation_members`, `messages` (RLS: members
  only — `exists (select 1 from conversation_members where conversation_id = ... and user_id = auth.uid())`).
- Subscribe: `supabase.channel('msgs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ...)`.

## 5. XP / quiz records (half a day)

- Move `stats`, `xp`, `quiz_records` to a `profiles`/`quiz_records` table;
  write XP changes in the same transaction as the action (or a Postgres
  function `add_xp(delta)`) so clients can't self-award arbitrarily.

## What stays client-side

- Theme, language, draft composer state — unaffected.
- The existing encrypted vault can keep acting as the **DM end-to-end
  layer** later: after Supabase auth, wrap a per-conversation DEK with the
  members' keys and store only ciphertext in `messages.content`. Not needed
  for launch — RLS already protects reads.

## Migration of existing local accounts

Not worth it: the vault holds at most your own test data. Ship Supabase
auth fresh; keep the local vault as an offline fallback behind a feature
flag if you want.

## Env plumbing checklist

- [ ] `.env.local` with the two vars (gitignored)
- [ ] `src/lib/supabase.ts` client
- [ ] GitHub Action: add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
      as repository secrets and map them into the build step env
- [ ] Enable RLS on **every** table before first deploy — never ship an
      open table
