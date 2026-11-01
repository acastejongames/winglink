# WingLink — Where Aviation Connects

A polished, responsive **social network for aviation enthusiasts** — spotters, pilots,
simulators fans, military and commercial aviation fans, and historians. WingLink is
*not* a game, simulator, marketplace or encyclopedia: the social feed, profiles,
communities and messaging are the product.

![Brand](public/images/f22-sunset.jpg)

## Highlights

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
  member lists, dedicated feeds, challenges and activity rankings. Creation is unlocked
  at Level 5 as a trust requirement.
- **Activities** — *Guess the Aircraft* plus Guess the Manufacturer / Cockpit /
  Silhouette / Country, Aviation Trivia, History Quiz and Aircraft Comparison, with
  difficulty levels, optional timer, streaks, XP rewards, game history, personal
  records and Global / Weekly / Monthly leaderboards. Seasonal challenges and
  aviation-themed ranks (Cadet → Air Marshal).
- **Aircraft database** — a secondary, searchable reference with categories,
  specifications, variants, related aircraft, favorites and public/private personal
  collections. It deliberately complements — never dominates — the social network.
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
- **Languages** — full English / Spanish localization of every interface string
  (452 keys per language), switchable in Settings and on the sign-in screen.

## Tech

- React 18 · TypeScript · Tailwind CSS · Vite · React Router
- Reusable component library (`src/components`), context-based store with
  localStorage persistence (`src/lib/store.tsx`)
- `@fontsource-variable` Inter + Space Grotesk (bundled, no external font CDN)
- lucide-react icons

## Demo & data honesty

This build runs **without a backend**, and says so openly:

- Every seeded member, post, community and conversation is labelled **“Seed content /
  Demo”** in the UI.
- Accounts are stored **locally on your device**; sign-up, sign-in, posts, likes,
  messages and XP all work for real against that local store — nothing is sent
  anywhere.
- The data layer is written to integrate with **Supabase** (auth, Postgres, storage,
  realtime) when a project is connected; demo mode never pretends backend features are
  operational.
- No advertising, no subscriptions, no paid competitive advantages — WingLink launches
  completely free.

Aircraft photography is sourced from free stock collections (Pexels, Pixabay and
public-domain/press imagery) for demonstration purposes.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm test         # route & interaction smoke tests (jsdom)
```

Sign up for a local account, or press **“Continue with a demo member”** to explore a
fully seeded profile instantly.

## Structure

```
src/
├── components/        # UI primitives, logo, feed, modals, avatars
├── layout/            # AppShell: sidebar, top bar, bottom nav
├── lib/
│   ├── store.tsx      # global state (auth, social, XP, persistence)
│   ├── i18n.tsx       # English / Spanish dictionaries + provider
│   ├── gamification.ts# ranks, badges, cosmetic frames
│   └── demo/          # seed users, posts, communities, aircraft, quiz
├── pages/             # one file per route
└── test/smoke.test.tsx
```
