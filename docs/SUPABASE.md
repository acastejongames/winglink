# Connecting Supabase (WingLink cloud backend)

The full backend is **already implemented in this repo**:

| Piece | Where |
|---|---|
| Complete schema + RLS + XP triggers + Realtime + Storage | `supabase/schema.sql` |
| Client + media uploads | `src/lib/supabase.ts` |
| All networked reads/writes (posts, comments, reactions, follows, friends, communities, DMs, notifications, quiz/XP) | `src/lib/cloud.ts` |
| Dual-mode store (cloud when env present, encrypted local vault otherwise) | `src/lib/store.tsx` |
| CI wiring (secrets → build) | `.github/workflows/deploy-pages.yml` |

Without env vars the app runs exactly as before (on-device encrypted vault).
With env vars it becomes a **real multi-user network**: posts, comments, likes,
follows, DMs and notifications are shared across everyone, live (Realtime),
protected by Row Level Security.

## Setup (once, ~5 minutes)

1. **Create the project**: [supabase.com](https://supabase.com) → New project.
   Keep the database password safe — it is never needed by the app and must
   never be committed anywhere.
2. **Run the schema**: Dashboard → **SQL Editor** → paste the entire contents of
   [`supabase/schema.sql`](../supabase/schema.sql) → **Run**. This creates all
   tables, RLS policies, XP triggers, RPCs, the `media` Storage bucket and the
   Realtime publication.
3. **Get the public credentials**: Dashboard → **Project Settings → API**:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
     (this key is *meant* to be public — it ships in the browser bundle; RLS is
     the real gatekeeper. Never commit the `service_role` key or the DB password.)
4. **Local dev**: copy `.env.example` to `.env.local` and fill the two values.
5. **Production (GitHub Pages)**: repo **Settings → Secrets and variables →
   Actions → New repository secret**, twice:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   Push to `arena/d4554afa-winglink` — the workflow bakes them into the build.
6. **Auth settings** (Dashboard → Authentication → Providers → Email):
   - For instant onboarding: turn **Confirm email** OFF (recommended while
     building/testing). If left ON, new users must click the confirmation link
     before signing in.
   - Password min length: set to 8 to match the client.

## Verify

1. Sign up with two different emails in two different browsers.
2. Publish a post with user A → it appears for user B instantly (Realtime).
3. React/comment with B → A gets a live notification.
4. DM A↔B → delivered in realtime; a third account cannot see the thread
   (RLS `conversation_members`-only).
5. XP: posting grants +15 server-side (trigger) — the browser cannot inflate it.

## Architecture notes

- **Auth**: Supabase Auth (email + password). The client never stores passwords;
  a DB trigger (`handle_new_user`) creates the profile row and grants the
  +150 signup XP.
- **XP is server-owned**: triggers on `posts`, `comments`, `reactions`,
  `follows`, `friendships`, `community_members` + RPCs `submit_quiz`,
  `claim_challenge_xp`. The client only *displays* XP (level-up toast on
  realtime profile updates).
- **Privacy**: emails live only in Supabase Auth; DMs readable only by their
  members; profiles carry no email column; reports go to a table only staff can
  read (Dashboard).
- **Device-local** (not synced): theme, language, saved posts, favorites,
  collections, claim state of seasonal challenges, and the on-device encrypted
  vault used in local mode.
- **Honest limit**: messages are RLS-protected (nobody outside the conversation
  can read them) but not end-to-end encrypted — Supabase could theoretically
  read them. Client-side E2EE is possible as a future layer (the local vault
  crypto in `src/lib/crypto.ts` is the building block).

## Triage

- App shows the local vault instead of the network → env vars missing in that
  build (check `.env.local` / GitHub secrets).
- "Server error" toasts → schema not yet run, or RLS blocking: re-run
  `supabase/schema.sql` (it is idempotent).
- Realtime silent → table missing from the `supabase_realtime` publication
  (Dashboard → Database → Replication).
