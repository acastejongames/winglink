# WingLink — Where Aviation Connects

The international **social network for aviation enthusiasts** — spotters, pilots,
simulators fans, military and commercial aviation fans, and historians. WingLink is
*not* a game, simulator, marketplace or encyclopedia: the social feed, profiles,
communities and messaging are the product.

🌍 **Live:** [acastejongames.github.io/winglink](https://acastejongames.github.io/winglink/) ·
English & Spanish · Dark mode by default · Free forever, no ads

## What's inside

- **Social feed** — Following / Recommended / Communities tabs, text, photo, carousel,
  album, video, poll, question and news post types, custom reactions, comments with
  replies, hashtags, mentions, saving and sharing (including share-to-message).
- **Profiles** — cover, avatar frames, bio, country, aviation identity tags, favorite
  aircraft, follower/following/friends stats, XP & ranks, badges, and Posts / Media /
  Collections / Achievements / About tabs. Public & private accounts, follow requests
  and mutual friendships with accept/decline.
- **Explore & global search** — trending posts, popular hashtags, suggested people and
  communities, popular photographs, trending topics and filterable search across
  people, posts, communities, hashtags and aircraft.
- **Communities** — public & private groups with banners, rules, moderation roles,
  member lists, dedicated feeds, challenges and activity rankings. Creation unlocks at
  Level 5 as a trust requirement.
- **Activities** — *Guess the Aircraft* plus Guess the Manufacturer / Cockpit /
  Silhouette / Country, Aviation Trivia, History Quiz and Aircraft Comparison, with
  difficulty levels, optional timer, streaks, XP rewards, game history, personal
  records and Global / Weekly / Monthly leaderboards. Seasonal challenges and
  aviation-themed ranks (Cadet → Air Marshal).
- **Aircraft database** — a secondary, searchable reference with categories,
  specifications, variants, related aircraft, favorites and public/private personal
  collections. It complements — never dominates — the social network.
- **Messaging** — DMs, group chats and community chats with text, images, shared posts
  and aircraft cards, unread indicators and configurable message permissions.
- **Notifications** — categorized center (followers, friends, reactions, comments,
  mentions, communities, messages, challenges, achievements) with per-category
  preferences.
- **Safety & privacy** — public/private profiles, granular visibility controls,
  blocking, content reporting, community moderation roles, never-exposed precise
  locations, and a minimum age of 13 (subject to local law).
- **Design system** — Midnight Navy `#101D30`, Aviation Blue `#1C3552`, Sky Cyan
  `#70C8FF`, Cloud White `#F1F5F9`; dark mode by default with a light mode toggle;
  original wing+wordmark logo; subtle motion; desktop sidebar + right rail, mobile
  bottom navigation.
- **Languages** — full English / Spanish localization of every interface string,
  switchable in Settings and on the sign-in screen (auto-detected from your browser).

## Tech

- React 18 · TypeScript · Tailwind CSS · Vite · React Router
- Reusable component library (`src/components`), context-based store with
  localStorage persistence (`src/lib/store.tsx`)
- `@fontsource-variable` Inter + Space Grotesk (bundled, no external font CDN)
- lucide-react icons
- Vitest + jsdom smoke suite covering every route and key interactions

## Security & privacy

WingLink encrypts everything private **on your device**:

- **Passwords are never stored.** They exist only in memory while deriving
  encryption keys (PBKDF2-SHA256, 600,000 iterations, per-account random salt).
- **The vault is AES-256-GCM.** Emails, private messages, posts, settings and
  every other byte of account data are persisted only as ciphertext
  (`winglink.vault.v3`). Without the password the data is unreadable — even
  with full disk access to the browser profile.
- **Key hierarchy:** password → non-extractable KEK (memory only) → verifies
  the account and unwraps a random data key that actually encrypts the vault.
- **Per-tab session:** the unwrapped key lives in `sessionStorage` only, so
  reloads stay signed in while the tab lives and are signed out everywhere
  else. Close the tab → the key is gone.
- **No clear-text email index:** sign-in is by username; the email sits only
  inside the encrypted payload.
- **Production CSP** (`script-src 'self'`, no external origins, no plugins)
  plus React's default output encoding keep the XSS surface minimal.
- **Honest limits:** this is client-side encryption without a backend, so it
  protects data at rest on the device — it does not sync across devices or
  defend against an attacker who has the unlocked device open. Cloud sync
  (Supabase) can reuse the same envelope when it lands.

If you forget your password, the vault cannot be recovered — the app says so
at sign-up.

## Accounts & data

- **Cloud mode (real network)**: when `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` are configured (see [`docs/SUPABASE.md`](docs/SUPABASE.md)),
  accounts, posts, comments, reactions, follows, communities, DMs and
  notifications are stored in Supabase (Postgres + RLS + Realtime) and shared
  live across all users. XP is granted by server-side triggers, not the client.
- **Local mode (no env vars)**: the app falls back to an on-device encrypted
  vault (AES-256-GCM, password-derived keys) — data persists between visits on
  that device only.
- The full backend schema lives in [`supabase/schema.sql`](supabase/schema.sql).
- Aircraft photography comes from free stock collections (Pexels, Pixabay and
  public-domain/press imagery).
- No advertising, no subscriptions, no paid competitive advantages.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm test         # route & interaction smoke tests (jsdom)
```

Pushes to the `arena/d4554afa-winglink` branch auto-deploy to GitHub Pages via
GitHub Actions (`.github/workflows/deploy-pages.yml`).

## Structure

```
src/
├── components/        # UI primitives, logo, feed, modals, avatars
├── layout/            # AppShell: sidebar, top bar, bottom nav
├── lib/
│   ├── store.tsx      # global state (auth, social, XP, persistence)
│   ├── i18n.tsx       # English / Spanish dictionaries + provider
│   ├── gamification.ts# ranks, badges, cosmetic frames
│   └── content/        # aircraft DB, quiz questions, seasonal challenges
├── pages/             # one file per route
└── test/smoke.test.tsx
```
