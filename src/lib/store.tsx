import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  AircraftCollection,
  AppNotification,
  Comment,
  Community,
  Conversation,
  Difficulty,
  Language,
  Message,
  Post,
  QuizMode,
  QuizRecord,
  ThemeMode,
  User,
} from './types'
import { levelFromXp, uid, hashPassword } from './utils'
import {
  EMPTY_VAULT,
  VAULT_VERSION,
  createAccount,
  decryptJson,
  encryptJson,
  exportDek,
  importDek,
  unlockAccount,
  type VaultStore,
} from './crypto'
import { BADGE_DEFS, LEVEL_BADGES, RANK_NAMES, rankForLevel } from './gamification'
import { useI18n } from './i18n'
import { useToast } from '@/components/ui/Toast'
import { hostImages, isCloud, sb } from './supabase'
import * as cloud from './cloud'

// Encrypted vault (AES-256-GCM, key derived from the password via PBKDF2).
// Nothing private — emails, messages, posts — is ever written in clear text.
const VAULT_KEY = 'winglink.vault.v3'
// Per-tab unlock session so reloads stay signed in while the tab lives.
// Cleared automatically when the tab/session ends.
const SESSION_KEY = 'winglink.session.v3'
// Pre-vault plaintext data; migrated into the vault on next sign-in, then deleted.
const LEGACY_KEY = 'winglink.state.v2'

export interface ReportEntry {
  id: string
  targetType: 'post' | 'user' | 'community'
  targetId: string
  reason: string
  details?: string
  at: string
}

export interface Prefs {
  whoCanMessage: 'everyone' | 'followers' | 'nobody'
  whoCanSeeFollowers: 'everyone' | 'followers' | 'nobody'
  whoCanTag: 'everyone' | 'followers' | 'nobody'
  notify: Record<string, boolean>
}

export interface Progress {
  posts: number
  comments: number
  quizzes: number
  xpEarned: number
}

interface PersistedState {
  authUserId: string | null
  users: User[]
  posts: Post[]
  communities: Community[]
  conversations: Conversation[]
  notifications: AppNotification[]
  following: string[]
  friends: string[]
  incomingRequests: string[]
  outgoingRequests: string[]
  blocked: string[]
  reports: ReportEntry[]
  favoriteAircraft: string[]
  collections: AircraftCollection[]
  quizRecords: QuizRecord[]
  claimedChallenges: string[]
  progress: Progress
  prefs: Prefs
}

const defaultPrefs: Prefs = {
  whoCanMessage: 'everyone',
  whoCanSeeFollowers: 'everyone',
  whoCanTag: 'everyone',
  notify: {
    followers: true,
    friends: true,
    reactions: true,
    comments: true,
    mentions: true,
    communities: true,
    messages: true,
    challenges: true,
    achievements: true,
  },
}

function freshState(): PersistedState {
  return {
    authUserId: null,
    users: [],
    posts: [],
    communities: [],
    conversations: [],
    notifications: [],
    following: [],
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    blocked: [],
    reports: [],
    favoriteAircraft: [],
    collections: [],
    quizRecords: [],
    claimedChallenges: [],
    progress: { posts: 0, comments: 0, quizzes: 0, xpEarned: 0 },
    prefs: defaultPrefs,
  }
}

// ── Vault storage helpers ───────────────────────────────────────────
function readVault(): VaultStore {
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    if (!raw) return { ...EMPTY_VAULT }
    const parsed = JSON.parse(raw) as VaultStore
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.accounts)) return { ...EMPTY_VAULT }
    return { version: parsed.version ?? VAULT_VERSION, accounts: parsed.accounts, payloads: parsed.payloads ?? {} }
  } catch {
    return { ...EMPTY_VAULT }
  }
}

function writeVault(vault: VaultStore) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault))
}

interface VaultSession {
  accountId: string
  dek: string
}

function readSession(): VaultSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as VaultSession
    return parsed && parsed.accountId && parsed.dek ? parsed : null
  } catch {
    return null
  }
}

function writeSession(accountId: string, dekB64: string) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ accountId, dek: dekB64 }))
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

// ── Device-local storage (cloud mode) ─────────────────────────────
// In cloud mode the vault is unused; only non-sensitive preferences
// (theme-adjacent UI state) stay on this device. Never emails/DMs.
const DEVICE_KEY = 'winglink.device.v1'

interface DeviceLocal {
  prefs: Prefs
  favoriteAircraft: string[]
  collections: AircraftCollection[]
  claimedChallenges: string[]
}

function readDeviceLocal(): DeviceLocal | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DeviceLocal
    if (!parsed || typeof parsed !== 'object') return null
    return {
      prefs: {
        ...defaultPrefs,
        ...parsed.prefs,
        notify: { ...defaultPrefs.notify, ...parsed.prefs?.notify },
      },
      favoriteAircraft: parsed.favoriteAircraft ?? [],
      collections: parsed.collections ?? [],
      claimedChallenges: parsed.claimedChallenges ?? [],
    }
  } catch {
    return null
  }
}

function writeDeviceLocal(s: PersistedState) {
  try {
    localStorage.setItem(
      DEVICE_KEY,
      JSON.stringify({
        prefs: s.prefs,
        favoriteAircraft: s.favoriteAircraft,
        collections: s.collections,
        claimedChallenges: s.claimedChallenges,
      }),
    )
  } catch {
    /* ignore quota/private-mode errors */
  }
}

function readLegacy(): PersistedState | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedState
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.users)) return null
    return { ...freshState(), ...parsed }
  } catch {
    return null
  }
}

function normalizeState(parsed: Partial<PersistedState>): PersistedState {
  return {
    ...freshState(),
    ...(parsed as PersistedState),
    prefs: { ...defaultPrefs, ...parsed.prefs, notify: { ...defaultPrefs.notify, ...parsed.prefs?.notify } },
  }
}

/** Strip legacy credential material before a payload goes into the vault. */
function stripLegacyCredentials(s: PersistedState): PersistedState {
  return { ...s, users: s.users.map(({ passHash: _ph, ...u }) => u) }
}

interface StoreValue {
  state: PersistedState
  me: User | null
  /** False until the vault has been unlocked (or determined absent) at boot. */
  hydrated: boolean
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  lang: Language
  // auth — passwords are used only to derive encryption keys, never stored
  signIn: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signUp: (data: { email: string; username: string; displayName: string; password: string; interests: string[] }) => Promise<{ ok: boolean; error?: string }>
  signOut: () => void
  // users & social
  getUser: (id: string) => User | undefined
  getUserByUsername: (username: string) => User | undefined
  updateProfile: (patch: Partial<User>) => void
  toggleFollow: (userId: string) => void
  isFollowing: (userId: string) => boolean
  sendFriendRequest: (userId: string) => void
  acceptFriend: (userId: string) => void
  declineFriend: (userId: string) => void
  removeFriend: (userId: string) => void
  isFriend: (userId: string) => boolean
  blockUser: (userId: string) => void
  unblockUser: (userId: string) => void
  // posts
  addPost: (post: Partial<Post> & { text: string; type: Post['type'] }) => void
  deletePost: (id: string) => void
  toggleLike: (id: string) => void
  setReaction: (id: string, emoji: string | null) => void
  toggleSave: (id: string) => void
  sharePost: (id: string) => void
  votePoll: (postId: string, optionId: string) => void
  addComment: (postId: string, text: string, replyTo?: string) => void
  toggleCommentLike: (postId: string, commentId: string) => void
  // communities
  toggleJoinCommunity: (id: string) => void
  createCommunity: (data: { name: string; description: string; category: string; visibility: 'public' | 'private'; rules: string[]; avatar: string; banner: string }) => string | null
  joinChallenge: (communityId: string, challengeId: string) => void
  // aircraft
  toggleFavoriteAircraft: (id: string) => void
  createCollection: (name: string, visibility: 'public' | 'private') => string
  addToCollection: (collectionId: string, aircraftId: string) => void
  removeFromCollection: (collectionId: string, aircraftId: string) => void
  // messaging
  sendMessage: (conversationId: string, msg: Partial<Message> & { kind: Message['kind'] }) => void
  markConversationRead: (conversationId: string) => void
  ensureConversationWith: (userId: string) => Promise<string>
  // notifications
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  setPref: (key: string, value: boolean) => void
  setPrefValue: (key: keyof Prefs, value: string) => void
  // gamification
  addXp: (amount: number, reason: string) => void
  addQuizResult: (mode: QuizMode, difficulty: Difficulty, score: number, total: number, xp: number) => void
  claimChallenge: (id: string, rewardXp: number) => void
  // safety
  report: (targetType: ReportEntry['targetType'], targetId: string, reason: string, details?: string) => void
  resetData: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(freshState)
  const [hydrated, setHydrated] = useState(false)
  const [theme, setThemeState] = useState<ThemeMode>(() => (localStorage.getItem('winglink.theme') === 'light' ? 'light' : 'dark'))
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const stateRef = useRef(state)
  stateRef.current = state
  const dekRef = useRef<CryptoKey | null>(null)
  const cloudCleanup = useRef<(() => void) | null>(null)

  // ── Cloud (Supabase) bootstrap + realtime ────────────────────────
  const applyServerXp = useCallback(
    (s: PersistedState, newXp: number): PersistedState => {
      const user = s.users.find((u) => u.id === s.authUserId)
      if (!user || newXp === user.xp) return s
      const beforeLevel = levelFromXp(user.xp)
      const afterLevel = levelFromXp(newXp)
      let next: PersistedState = {
        ...s,
        users: s.users.map((u) => (u.id === user.id ? { ...u, xp: newXp } : u)),
      }
      if (afterLevel > beforeLevel) {
        const rank = rankForLevel(afterLevel)
        const rankName = RANK_NAMES[rank.id][lang]
        const text = t('notifications.levelUp', { rank: rankName })
        next = {
          ...next,
          notifications: [
            { id: uid('n'), category: 'achievements', text, createdAt: new Date().toISOString(), read: false },
            ...next.notifications,
          ],
        }
        toast(text)
      }
      return next
    },
    [lang, t, toast],
  )

  const startRealtime = useCallback(
    (uidAuth: string) => {
      cloudCleanup.current?.()
      cloudCleanup.current = cloud.subscribeCloud({
        onPostInsert: (row) => {
          const id = row.id as string
          if (stateRef.current.posts.some((p) => p.id === id)) return
          const post = cloud.rowToPost(row, {
            comments: [],
            reactions: [],
            commentLikes: [],
            pollVotes: [],
            meId: uidAuth,
          })
          void cloud.loadUserRemote(post.authorId).then((u) => {
            if (u)
              setState((s) => (s.users.some((x) => x.id === u.id) ? s : { ...s, users: [...s.users, u] }))
          })
          setState((s) => (s.posts.some((p) => p.id === id) ? s : { ...s, posts: [post, ...s.posts] }))
        },
        onPostDelete: (old) => {
          setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== old.id) }))
        },
        onReactionInsert: (row) => {
          if (row.user_id === uidAuth) return
          setState((s) => ({
            ...s,
            posts: s.posts.map((p) => {
              if (p.id !== row.post_id) return p
              const e = row.emoji as string
              return {
                ...p,
                reactions: { ...p.reactions, [e]: (p.reactions[e] ?? 0) + 1 },
                likes: e === '❤️' ? p.likes + 1 : p.likes,
              }
            }),
          }))
        },
        onReactionDelete: (old) => {
          if (old.user_id === uidAuth) return
          const postId = old.post_id as string
          void cloud.loadPostReactions(postId, uidAuth).then((rx) => {
            setState((s) => ({
              ...s,
              posts: s.posts.map((p) =>
                p.id === postId
                  ? { ...p, reactions: rx.reactions, likes: rx.likes, myReaction: rx.myReaction, likedByMe: rx.myReaction === '❤️' }
                  : p,
              ),
            }))
          })
        },
        onCommentInsert: (row) => {
          if (row.author_id === uidAuth) return
          const comment = cloud.rowToComment(row, new Set<string>())
          setState((s) => ({
            ...s,
            posts: s.posts.map((p) => {
              if (p.id !== row.post_id) return p
              if (p.comments.some((c) => c.id === comment.id)) return p
              if (row.reply_to) {
                return {
                  ...p,
                  comments: p.comments.map((c) =>
                    c.id === row.reply_to ? { ...c, replies: [...c.replies, comment] } : c,
                  ),
                }
              }
              return { ...p, comments: [comment, ...p.comments] }
            }),
          }))
        },
        onCommentLikeChange: (row, op) => {
          if (row.user_id === uidAuth) return
          const delta = op === 'INSERT' ? 1 : -1
          setState((s) => ({
            ...s,
            posts: s.posts.map((p) => ({
              ...p,
              comments: p.comments.map((c) => {
                if (c.id === row.comment_id) return { ...c, likes: Math.max(0, c.likes + delta) }
                return {
                  ...c,
                  replies: c.replies.map((r) =>
                    r.id === row.comment_id ? { ...r, likes: Math.max(0, r.likes + delta) } : r,
                  ),
                }
              }),
            })),
          }))
        },
        onFollowChange: (row, op) => {
          const delta = op === 'INSERT' ? 1 : -1
          setState((s) => {
            let users = s.users
            if (row.followed_id === uidAuth) {
              users = users.map((u) =>
                u.id === uidAuth ? { ...u, followers: Math.max(0, u.followers + delta) } : u,
              )
            }
            if (row.follower_id === uidAuth) {
              users = users.map((u) =>
                u.id === uidAuth ? { ...u, following: Math.max(0, u.following + delta) } : u,
              )
              const following =
                op === 'INSERT'
                  ? Array.from(new Set([...s.following, row.followed_id as string]))
                  : s.following.filter((id) => id !== row.followed_id)
              return { ...s, users, following }
            }
            return { ...s, users }
          })
        },
        onMessageInsert: (row) => {
          if (row.sender_id === uidAuth) return
          const msg: Message = {
            id: row.id as string,
            senderId: row.sender_id as string,
            kind: row.kind as Message['kind'],
            text: (row.text as string | null) ?? undefined,
            image: (row.image as string | null) ?? undefined,
            postId: (row.post_id as string | null) ?? undefined,
            aircraftId: (row.aircraft_id as string | null) ?? undefined,
            createdAt: row.created_at as string,
          }
          setState((s) => ({
            ...s,
            conversations: s.conversations.map((c) =>
              c.id === row.conversation_id
                ? c.messages.some((m) => m.id === msg.id)
                  ? c
                  : { ...c, messages: [...c.messages, msg], unread: c.unread + 1 }
                : c,
            ),
          }))
        },
        onNotificationInsert: (row) => {
          const n = cloud.rowToNotification(row)
          setState((s) =>
            s.notifications.some((x) => x.id === n.id) ? s : { ...s, notifications: [n, ...s.notifications] },
          )
        },
        onProfileChange: (row) => {
          const u = cloud.rowToUser(row)
          setState((s) => {
            const prev = s.users.find((x) => x.id === u.id)
            const users = prev ? s.users.map((x) => (x.id === u.id ? u : x)) : [...s.users, u]
            let next: PersistedState = { ...s, users }
            if (u.id === s.authUserId && prev && prev.xp !== u.xp) next = applyServerXp(next, u.xp)
            return next
          })
        },
        onFriendRequestInsert: (row) => {
          if (row.to_id === uidAuth) {
            setState((s) => ({
              ...s,
              incomingRequests: Array.from(new Set([...s.incomingRequests, row.from_id as string])),
            }))
          } else if (row.from_id === uidAuth) {
            setState((s) => ({
              ...s,
              outgoingRequests: Array.from(new Set([...s.outgoingRequests, row.to_id as string])),
            }))
          }
        },
        onFriendshipChange: (row, op) => {
          const other = (row.user_a === uidAuth ? row.user_b : row.user_a) as string
          setState((s) => {
            const friends =
              op === 'INSERT' ? Array.from(new Set([...s.friends, other])) : s.friends.filter((id) => id !== other)
            return { ...s, friends, incomingRequests: s.incomingRequests.filter((id) => id !== other) }
          })
        },
        onCommunityChange: (row) => {
          setState((s) => {
            if (s.communities.some((c) => c.id === row.id)) {
              return {
                ...s,
                communities: s.communities.map((c) =>
                  c.id === row.id
                    ? {
                        ...c,
                        name: (row.name as string) ?? c.name,
                        description: (row.description as string) ?? c.description,
                        memberCount: (row.member_count as number) ?? c.memberCount,
                        visibility: (row.visibility as Community['visibility']) ?? c.visibility,
                        rules: (row.rules as string[]) ?? c.rules,
                      }
                    : c,
                ),
              }
            }
            const c: Community = {
              id: row.id as string,
              slug: row.slug as string,
              name: row.name as string,
              avatar: (row.avatar as string) ?? '',
              banner: (row.banner as string) ?? 'images/f22-sunset.jpg',
              description: (row.description as string) ?? '',
              rules: (row.rules as string[]) ?? [],
              category: (row.category as string) ?? 'general',
              visibility: (row.visibility as 'public' | 'private') ?? 'public',
              memberCount: (row.member_count as number) ?? 0,
              memberIds: [],
              adminIds: (row.admin_ids as string[]) ?? [],
              modIds: (row.mod_ids as string[]) ?? [],
              joined: false,
              createdAt: (row.created_at as string) ?? new Date().toISOString(),
              challenges: [],
            }
            return { ...s, communities: [c, ...s.communities] }
          })
        },
        onCommunityMemberChange: (row, op) => {
          setState((s) => {
            const cid = row.community_id as string
            const memberUid = row.user_id as string
            const communities = s.communities.map((c) => {
              if (c.id !== cid) return c
              if (op === 'DELETE') {
                return {
                  ...c,
                  memberIds: c.memberIds.filter((m) => m !== memberUid),
                  joined: memberUid === s.authUserId ? false : c.joined,
                  memberCount: Math.max(0, c.memberCount - 1),
                }
              }
              if (op === 'INSERT' && row.status === 'pending' && memberUid === s.authUserId) {
                return { ...c, pending: true }
              }
              if (row.status !== 'member') return c
              const already = c.memberIds.includes(memberUid)
              const iAmMember = memberUid === s.authUserId
              return {
                ...c,
                memberIds: already ? c.memberIds : [...c.memberIds, memberUid],
                joined: iAmMember ? true : c.joined,
                pending: iAmMember ? false : c.pending,
                memberCount: already ? c.memberCount : c.memberCount + 1,
              }
            })
            return { ...s, communities }
          })
        },
      })
    },
    [applyServerXp],
  )

  const bootstrapCloud = useCallback(
    async (uidAuth: string) => {
      if (stateRef.current.authUserId === uidAuth) return
      const device = readDeviceLocal()
      try {
        const stage = <T,>(label: string, p: Promise<T>): Promise<T> =>
          p.catch((e) => {
            throw new Error(`${label}: ${(e as Error).message}`)
          })
        let [users, posts, social, communities, conversations, notifications, quizRecords] = await Promise.all([
          stage('users', cloud.loadUsers()),
          stage('feed', cloud.loadFeed(uidAuth)),
          stage('social', cloud.loadSocial(uidAuth)),
          stage('communities', cloud.loadCommunities(uidAuth)),
          stage('messages', cloud.loadConversations(uidAuth)),
          stage('notifications', cloud.loadNotifications(uidAuth)),
          stage('quiz', cloud.loadQuizRecords()),
        ])
        // Self-heal: if the signup trigger failed to create the profile row,
        // insert our own (RLS allows id = auth.uid() only).
        if (!users.some((u) => u.id === uidAuth)) {
          const { data: authUser } = await sb().auth.getUser()
          const meta = (authUser?.user?.user_metadata ?? {}) as Record<string, string>
          const uname = (meta.username ?? `pilot_${uidAuth.slice(0, 6)}`).toLowerCase()
          const { error: healErr } = await sb().from('profiles').upsert({
            id: uidAuth,
            username: uname,
            display_name: meta.display_name ?? uname,
            interests: Array.isArray(meta.interests) ? meta.interests : [],
            xp: 150,
          })
          if (healErr) console.error('[winglink] profile self-heal failed:', healErr.message)
          const healed = await cloud.loadUsers()
          users = healed.length ? healed : users
        }
        setState((s) => ({
          ...freshState(),
          ...social,
          users,
          posts,
          communities,
          conversations,
          notifications,
          quizRecords,
          authUserId: uidAuth,
          prefs: device?.prefs ?? s.prefs,
          favoriteAircraft: device?.favoriteAircraft ?? [],
          collections: device?.collections ?? [],
          claimedChallenges: device?.claimedChallenges ?? [],
        }))
        setHydrated(true)
        startRealtime(uidAuth)
      } catch (e) {
        console.error(e)
        toast(t('common.errCloud'))
        setHydrated(true)
      }
    },
    [startRealtime, t, toast],
  )

  // Boot: in cloud mode attach to the Supabase session; otherwise unlock the
  // encrypted vault with the per-tab session key.
  useEffect(() => {
    let cancelled = false
    if (isCloud()) {
      void (async () => {
        try {
          const { data } = await sb().auth.getSession()
          if (cancelled) return
          if (data.session) await bootstrapCloud(data.session.user.id)
          else setHydrated(true)
        } catch {
          if (!cancelled) setHydrated(true)
        }
      })()
      const { data: sub } = sb().auth.onAuthStateChange((event, session) => {
        if (cancelled) return
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          void bootstrapCloud(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          cloudCleanup.current?.()
          cloudCleanup.current = null
          setState(freshState())
          setHydrated(true)
        }
      })
      return () => {
        cancelled = true
        sub.subscription.unsubscribe()
        cloudCleanup.current?.()
        cloudCleanup.current = null
      }
    }
    ;(async () => {
      try {
        const vault = readVault()
        const session = readSession()
        const account = session ? vault.accounts.find((a) => a.id === session.accountId) : undefined
        const sealed = account ? vault.payloads[account.id] : undefined
        if (account && sealed && session) {
          const dek = await importDek(session.dek)
          const payload = await decryptJson<PersistedState>(dek, sealed)
          if (!cancelled) {
            dekRef.current = dek
            setState(normalizeState(payload))
            setHydrated(true)
            return
          }
        }
      } catch {
        /* corrupted or foreign payload — fall through to a clean signed-out state */
      }
      if (!cancelled) {
        clearSession()
        setState(freshState())
        setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bootstrapCloud])

  // Persist: re-encrypt the whole state into the vault. Never writes clear text.
  const persistSeq = useRef(0)
  const saveTimer = useRef<number | null>(null)
  useEffect(() => {
    if (!hydrated || !dekRef.current || !state.authUserId) return
    const seq = ++persistSeq.current
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      const dek = dekRef.current
      const accountId = state.authUserId
      if (!dek || !accountId) return
      void (async () => {
        try {
          const sealed = await encryptJson(dek, state)
          if (persistSeq.current !== seq) return // newer save supersedes
          const vault = readVault()
          vault.payloads[accountId] = sealed
          writeVault(vault)
        } catch {
          // Quota exceeded — replace oversized uploads with a stock photo and retry once.
          try {
            const trimmed: PersistedState = {
              ...state,
              posts: state.posts.map((p) => ({
                ...p,
                images: p.images?.map((img) => (img.startsWith('data:') ? 'images/f22-sky.jpg' : img)),
              })),
            }
            const sealed = await encryptJson(dek, trimmed)
            if (persistSeq.current !== seq) return
            const vault = readVault()
            vault.payloads[accountId] = sealed
            writeVault(vault)
          } catch {
            /* give up silently — the in-memory session still works */
          }
        }
      })()
    }, 350)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [state, hydrated])

  // Cloud mode: keep only device-local preferences on this machine.
  useEffect(() => {
    if (!hydrated || !isCloud()) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => writeDeviceLocal(state), 350)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [state, hydrated])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('winglink.theme', theme)
  }, [theme])

  const setTheme = useCallback((t2: ThemeMode) => setThemeState(t2), [])

  const me = useMemo(() => state.users.find((u) => u.id === state.authUserId) ?? null, [state.users, state.authUserId])

  // Persist newly-earned badges to the cloud profile (server holds the record).
  const syncedBadges = useRef<string | null>(null)
  useEffect(() => {
    if (!isCloud() || !me) return
    const joined = [...me.badges].sort().join(',')
    if (syncedBadges.current === null) {
      syncedBadges.current = joined
      return
    }
    if (joined !== syncedBadges.current) {
      syncedBadges.current = joined
      void cloud.updateProfileRemote(me.id, { badges: me.badges }).catch((e) => console.error(e))
    }
  }, [me])

  const patch = useCallback((fn: (s: PersistedState) => PersistedState) => {
    setState((prev) => fn(prev))
  }, [])

  const evaluateBadges = useCallback(
    (s: PersistedState, userId: string): PersistedState => {
      const user = s.users.find((u) => u.id === userId)
      if (!user) return s
      const level = levelFromXp(user.xp)
      const wanted = new Set<string>(user.badges)
      const newly: string[] = []
      const add = (id: string) => {
        if (!wanted.has(id)) {
          wanted.add(id)
          newly.push(id)
        }
      }
      if (s.progress.posts >= 1) add('first-post')
      if (s.progress.posts >= 5) add('spotter')
      if (s.progress.comments >= 10) add('conversation-starter')
      if (s.following.length >= 10) add('connector')
      if (s.communities.filter((c) => c.joined).length >= 3) add('community-builder')
      if (s.progress.quizzes >= 5) add('quiz-ace')
      for (const lb of LEVEL_BADGES) if (level >= lb.level) add(lb.badge)
      if (!newly.length) return s
      const notifications = [...s.notifications]
      for (const id of newly) {
        const def = BADGE_DEFS.find((b) => b.id === id)
        const name = lang === 'es' ? (def?.nameEs ?? id) : (def?.name ?? id)
        notifications.unshift({
          id: uid('n'),
          category: 'achievements',
          text: t('notifications.achievementUnlocked', { name }),
          createdAt: new Date().toISOString(),
          read: false,
        })
        toast(name)
      }
      return {
        ...s,
        users: s.users.map((u) => (u.id === userId ? { ...u, badges: [...wanted] } : u)),
        notifications,
      }
    },
    [t, toast],
  )

  const addXpRaw = useCallback(
    (s: PersistedState, amount: number): PersistedState => {
      if (!s.authUserId) return s
      let next = s
      const user = s.users.find((u) => u.id === s.authUserId)
      if (!user || amount <= 0) return s
      const beforeLevel = levelFromXp(user.xp)
      const afterLevel = levelFromXp(user.xp + amount)
      next = {
        ...next,
        users: next.users.map((u) => (u.id === user.id ? { ...u, xp: u.xp + amount } : u)),
        progress: { ...next.progress, xpEarned: next.progress.xpEarned + amount },
      }
      if (afterLevel > beforeLevel) {
        const rank = rankForLevel(afterLevel)
        const rankName = RANK_NAMES[rank.id][lang]
        next = {
          ...next,
          notifications: [
            {
              id: uid('n'),
              category: 'achievements',
              text: t('notifications.levelUp', { rank: rankName }),
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...next.notifications,
          ],
        }
        toast(t('notifications.levelUp', { rank: rankName }))
      }
      return evaluateBadges(next, user.id)
    },
    [evaluateBadges, lang, t, toast],
  )

  const addXp = useCallback(
    (amount: number) => {
      patch((s) => addXpRaw(s, amount))
    },
    [addXpRaw, patch],
  )

  // ── Auth ──────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (username: string, password: string) => {
      if (isCloud()) {
        const email = username.trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: t('auth.errEmail') }
        if (password.length < 8) return { ok: false, error: t('auth.errPassword') }
        const res = await cloud.cloudSignIn(email, password)
        if (!res.ok) return { ok: false, error: res.error ? t(res.error) : t('auth.errCloud') }
        toast(t('auth.signedIn'))
        return { ok: true }
      }
      const uname = username.trim().toLowerCase()
      if (!/^[a-z0-9_]{3,20}$/i.test(uname)) return { ok: false, error: t('auth.errUsername') }
      if (password.length < 8) return { ok: false, error: t('auth.errPassword') }

      // 1) Encrypted vault account
      const vault = readVault()
      const account = vault.accounts.find((a) => a.username === uname)
      if (account) {
        const dek = await unlockAccount(account, password)
        if (!dek) return { ok: false, error: t('auth.errWrongPassword') }
        const sealed = vault.payloads[account.id]
        const payload = sealed ? await decryptJson<PersistedState>(dek, sealed).catch(() => null) : null
        const next = payload ? normalizeState(payload) : { ...freshState(), authUserId: account.id }
        dekRef.current = dek
        writeSession(account.id, await exportDek(dek))
        setState(next)
        toast(t('auth.signedIn'))
        return { ok: true }
      }

      // 2) Legacy plaintext build — verify, then migrate into the vault
      const legacy = readLegacy()
      const legacyUser = legacy?.users.find((u) => u.username.toLowerCase() === uname)
      if (legacyUser && legacy) {
        if (!legacyUser.passHash || legacyUser.passHash !== hashPassword(password)) {
          return { ok: false, error: t('auth.errWrongPassword') }
        }
        const { account: newAcc, dek } = await createAccount(legacyUser.id, uname, password)
        const clean = stripLegacyCredentials({ ...legacy, authUserId: legacyUser.id })
        const sealed = await encryptJson(dek, clean)
        writeVault({ version: VAULT_VERSION, accounts: [newAcc], payloads: { [newAcc.id]: sealed } })
        localStorage.removeItem(LEGACY_KEY)
        dekRef.current = dek
        writeSession(newAcc.id, await exportDek(dek))
        setState(clean)
        toast(t('auth.signedIn'))
        return { ok: true }
      }

      return { ok: false, error: t('auth.errNoAccount') }
    },
    [t, toast],
  )

  const signUp = useCallback(
    async (data: { email: string; username: string; displayName: string; password: string; interests: string[] }) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { ok: false, error: t('auth.errEmail') }
      if (data.password.length < 8) return { ok: false, error: t('auth.errPassword') }
      const uname = data.username.trim().toLowerCase()
      if (!/^[a-z0-9_]{3,20}$/i.test(uname)) return { ok: false, error: t('auth.errUsername') }
      if (!data.displayName.trim()) return { ok: false, error: t('auth.errName') }
      if (isCloud()) {
        const res = await cloud.cloudSignUp({
          email: data.email,
          password: data.password,
          username: uname,
          displayName: data.displayName.trim(),
          interests: data.interests,
        })
        if (!res.ok) return { ok: false, error: res.error ? t(res.error) : t('auth.errCloud') }
        if (res.needsConfirm) toast(t('auth.checkEmail'))
        else toast(t('auth.welcome', { name: data.displayName.trim() }))
        return { ok: true }
      }
      const vault = readVault()
      if (vault.accounts.some((a) => a.username === uname)) return { ok: false, error: t('auth.errUserTaken') }
      const legacy = readLegacy()
      if (legacy?.users.some((u) => u.username.toLowerCase() === uname)) return { ok: false, error: t('auth.errUserTaken') }

      const id = uid('u')
      // The password exists only as key material — it is never stored anywhere.
      const { account, dek } = await createAccount(id, uname, data.password)
      const newUser: User = {
        id,
        username: uname,
        email: data.email,
        displayName: data.displayName.trim(),
        bio: '',
        avatar: '',
        cover: 'images/f22-sunset.jpg',
        country: '',
        countryCode: '',
        interests: data.interests,
        identityTags: [],
        favoriteAircraft: [],
        followers: 0,
        following: 0,
        friends: 0,
        postsCount: 0,
        xp: 150,
        badges: [],
        frame: 'none',
        visibility: 'public',
        joinedAt: new Date().toISOString(),
        stats: { posts: 0, likesReceived: 0, comments: 0, quizzesPlayed: 0, quizBestScore: 0, quizWins: 0, streak: 0 },
      }
      const initial: PersistedState = { ...freshState(), users: [newUser], authUserId: id }
      const sealed = await encryptJson(dek, initial)
      writeVault({ version: VAULT_VERSION, accounts: [...vault.accounts, account], payloads: { ...vault.payloads, [id]: sealed } })
      dekRef.current = dek
      writeSession(id, await exportDek(dek))
      setState(initial)
      toast(t('auth.welcome', { name: newUser.displayName }))
      return { ok: true }
    },
    [t, toast],
  )

  const signOut = useCallback(() => {
    if (isCloud()) void cloud.cloudSignOut()
    cloudCleanup.current?.()
    cloudCleanup.current = null
    dekRef.current = null
    clearSession()
    setState(freshState())
  }, [])

  const resetData = useCallback(() => {
    if (isCloud()) void cloud.cloudSignOut()
    cloudCleanup.current?.()
    cloudCleanup.current = null
    dekRef.current = null
    clearSession()
    localStorage.removeItem(VAULT_KEY)
    localStorage.removeItem(LEGACY_KEY)
    localStorage.removeItem(DEVICE_KEY)
    setState(freshState())
  }, [])

  // ── Users ─────────────────────────────────────────────────────────
  const getUser = useCallback((id: string) => state.users.find((u) => u.id === id), [state.users])
  const getUserByUsername = useCallback(
    (username: string) => state.users.find((u) => u.username.toLowerCase() === username.toLowerCase()),
    [state.users],
  )

  const updateProfile = useCallback(
    (userPatch: Partial<User>) => {
      patch((s) => ({ ...s, users: s.users.map((u) => (u.id === s.authUserId ? { ...u, ...userPatch } : u)) }))
      if (isCloud() && stateRef.current.authUserId) {
        void cloud
          .updateProfileRemote(stateRef.current.authUserId, userPatch as Record<string, unknown>)
          .catch((e) => {
            console.error(e)
            toast(t('common.errCloud'))
          })
      }
      toast(t('settings.saved'))
    },
    [patch, t, toast],
  )

  const isFollowing = useCallback((userId: string) => state.following.includes(userId), [state.following])

  const toggleFollow = useCallback(
    (userId: string) => {
      if (!state.authUserId || state.authUserId === userId) return
      const wasFollowing = stateRef.current.following.includes(userId)
      patch((s) => {
        const following = wasFollowing ? s.following.filter((id) => id !== userId) : [...s.following, userId]
        const users = s.users.map((u) => {
          if (u.id === userId) return { ...u, followers: Math.max(0, u.followers + (wasFollowing ? -1 : 1)) }
          if (u.id === s.authUserId) return { ...u, following: Math.max(0, u.following + (wasFollowing ? -1 : 1)) }
          return u
        })
        return { ...s, following, users }
      })
      if (isCloud() && state.authUserId) {
        void (wasFollowing
          ? cloud.unfollowRemote(userId, state.authUserId)
          : cloud.followRemote(userId, state.authUserId)
        ).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
      }
      if (!wasFollowing) {
        const target = state.users.find((u) => u.id === userId)
        toast(t('common.following') + (target ? ` · ${target.displayName}` : ''))
        if (!isCloud()) addXp(2)
      }
    },
    [addXp, patch, state.authUserId, state.following, state.users, t, toast],
  )

  const isFriend = useCallback((userId: string) => state.friends.includes(userId), [state.friends])

  const sendFriendRequest = useCallback(
    (userId: string) => {
      if (stateRef.current.friends.includes(userId) || stateRef.current.outgoingRequests.includes(userId)) return
      patch((s) => ({ ...s, outgoingRequests: [...s.outgoingRequests, userId] }))
      if (isCloud() && stateRef.current.authUserId) {
        void cloud.sendFriendRequestRemote(stateRef.current.authUserId, userId).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
      }
      toast(t('profile.friendPending'))
    },
    [patch, t, toast],
  )

  const acceptFriend = useCallback(
    (userId: string) => {
      patch((s) => {
        const incoming = s.incomingRequests.filter((id) => id !== userId)
        const friends = s.friends.includes(userId) ? s.friends : [...s.friends, userId]
        const users = s.users.map((u) => {
          if (u.id === s.authUserId) return { ...u, friends: u.friends + 1 }
          if (u.id === userId) return { ...u, friends: u.friends + 1 }
          return u
        })
        return { ...s, incomingRequests: incoming, friends, users }
      })
      if (isCloud() && stateRef.current.authUserId) {
        void cloud.acceptFriendRemote(userId, stateRef.current.authUserId).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
      } else {
        addXp(5)
      }
    },
    [addXp, patch, t, toast],
  )

  const declineFriend = useCallback(
    (userId: string) => {
      patch((s) => ({ ...s, incomingRequests: s.incomingRequests.filter((id) => id !== userId) }))
      if (isCloud() && stateRef.current.authUserId) {
        void cloud.declineFriendRemote(userId, stateRef.current.authUserId).catch((e) => console.error(e))
      }
    },
    [patch],
  )

  const removeFriend = useCallback(
    (userId: string) => {
      patch((s) => {
        const friends = s.friends.filter((id) => id !== userId)
        const users = s.users.map((u) => {
          if (u.id === s.authUserId) return { ...u, friends: Math.max(0, u.friends - 1) }
          if (u.id === userId) return { ...u, friends: Math.max(0, u.friends - 1) }
          return u
        })
        return { ...s, friends, users }
      })
      if (isCloud() && stateRef.current.authUserId) {
        void cloud.removeFriendRemote(stateRef.current.authUserId, userId).catch((e) => console.error(e))
      }
      toast(t('common.done'))
    },
    [patch, t, toast],
  )

  const blockUser = useCallback(
    (userId: string) => {
      patch((s) => ({
        ...s,
        blocked: [...s.blocked, userId],
        following: s.following.filter((id) => id !== userId),
        friends: s.friends.filter((id) => id !== userId),
        incomingRequests: s.incomingRequests.filter((id) => id !== userId),
        outgoingRequests: s.outgoingRequests.filter((id) => id !== userId),
      }))
      if (isCloud() && stateRef.current.authUserId) {
        void cloud.blockRemote(stateRef.current.authUserId, userId).catch((e) => console.error(e))
      }
      toast(t('common.block') + ' ✓')
    },
    [patch, t, toast],
  )

  const unblockUser = useCallback(
    (userId: string) => {
      patch((s) => ({ ...s, blocked: s.blocked.filter((id) => id !== userId) }))
      if (isCloud() && stateRef.current.authUserId) {
        void cloud.unblockRemote(stateRef.current.authUserId, userId).catch((e) => console.error(e))
      }
      toast(t('common.unblock') + ' ✓')
    },
    [patch, t, toast],
  )

  // ── Posts ──────────────────────────────────────────────────────────
  const addPost = useCallback(
    (draft: Partial<Post> & { text: string; type: Post['type'] }) => {
      if (!state.authUserId) return
      const meId = state.authUserId
      const hashtags = (draft.text.match(/#[\p{L}\p{N}_]+/gu) || []).map((m) => m.slice(1).toLowerCase())
      const mentions = (draft.text.match(/@[\w]+/g) || []).map((m) => m.slice(1).toLowerCase())
      const visibility = draft.visibility ?? 'public'

      if (isCloud()) {
        void (async () => {
          let images: string[] | undefined
          try {
            images = await hostImages(draft.images, meId)
          } catch (e) {
            console.error('[winglink] image upload failed:', e)
            toast(t(cloud.cloudErrorKey(e)))
            return
          }
          try {
            const id = await cloud.createPostRemote({
              authorId: meId,
              type: draft.type,
              text: draft.text,
              images,
              video: draft.video,
              poll: draft.poll,
              communityId: draft.communityId,
              visibility,
              hashtags,
              mentions,
            })
            const post: Post = {
              id,
              authorId: meId,
              type: draft.type,
              text: draft.text,
              images,
              video: draft.video,
              poll: draft.poll,
              communityId: draft.communityId,
              visibility,
              createdAt: new Date().toISOString(),
              likes: 0,
              shares: 0,
              comments: [],
              reactions: {},
              likedByMe: false,
              savedByMe: false,
              myReaction: null,
              votedOptionId: null,
              hashtags,
              mentions,
            }
            patch((s) => {
              if (s.posts.some((p) => p.id === id)) return s
              let next: PersistedState = {
                ...s,
                posts: [post, ...s.posts],
                progress: { ...s.progress, posts: s.progress.posts + 1 },
                users: s.users.map((u) => (u.id === meId ? { ...u, postsCount: u.postsCount + 1 } : u)),
              }
              next = evaluateBadges(next, meId)
              return next
            })
            toast(t('composer.published'))
          } catch (e) {
            console.error('[winglink] post insert failed:', e)
            toast(t(cloud.cloudErrorKey(e)))
          }
        })()
        return
      }

      const post: Post = {
        id: uid('p'),
        authorId: state.authUserId,
        type: draft.type,
        text: draft.text,
        images: draft.images,
        video: draft.video,
        poll: draft.poll,
        communityId: draft.communityId,
        visibility,
        createdAt: new Date().toISOString(),
        likes: 0,
        shares: 0,
        comments: [],
        reactions: {},
        likedByMe: false,
        savedByMe: false,
        myReaction: null,
        votedOptionId: null,
        hashtags,
        mentions,
      }
      patch((s) => {
        let next: PersistedState = {
          ...s,
          posts: [post, ...s.posts],
          progress: { ...s.progress, posts: s.progress.posts + 1 },
          users: s.users.map((u) => (u.id === s.authUserId ? { ...u, postsCount: u.postsCount + 1 } : u)),
        }
        next = addXpRaw(next, 15)
        next = evaluateBadges(next, s.authUserId ?? "")
        return next
      })
      toast(t('composer.published'))
    },
    [addXpRaw, evaluateBadges, patch, state.authUserId, t, toast],
  )

  const deletePost = useCallback(
    (id: string) => {
      patch((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }))
      if (isCloud()) {
        void cloud.deletePostRemote(id).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
      }
      toast(t('post.deleted'))
    },
    [patch, t, toast],
  )

  const toggleLike = useCallback(
    (id: string) => {
      patch((s) => ({
        ...s,
        posts: s.posts.map((p) => {
          if (p.id !== id) return p
          const liked = !p.likedByMe
          return {
            ...p,
            likedByMe: liked,
            likes: p.likes + (liked ? 1 : -1),
            myReaction: liked ? (p.myReaction ?? '❤️') : p.myReaction && p.myReaction !== '❤️' ? p.myReaction : null,
            reactions: liked
              ? { ...p.reactions, '❤️': (p.reactions['❤️'] ?? 0) + 1 }
              : { ...p.reactions, '❤️': Math.max(0, (p.reactions['❤️'] ?? 1) - 1) },
          }
        }),
      }))
      if (isCloud() && stateRef.current.authUserId) {
        const cur = stateRef.current.posts.find((p) => p.id === id)
        void cloud.setReactionRemote(id, stateRef.current.authUserId, !cur?.likedByMe ? '❤️' : null).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
      }
    },
    [patch, t, toast],
  )

  const setReaction = useCallback(
    (id: string, emoji: string | null) => {
      patch((s) => ({
        ...s,
        posts: s.posts.map((p) => {
          if (p.id !== id) return p
          const reactions = { ...p.reactions }
          if (p.myReaction) reactions[p.myReaction] = Math.max(0, (reactions[p.myReaction] ?? 1) - 1)
          let likedByMe = p.likedByMe
          let likes = p.likes
          if (emoji === '❤️') {
            if (!p.myReaction || p.myReaction !== '❤️') {
              likes = p.likes + (likedByMe ? 0 : 1)
              likedByMe = true
            }
          } else if (p.likedByMe && emoji !== '❤️') {
            likedByMe = false
            likes = Math.max(0, p.likes - 1)
          }
          if (emoji) reactions[emoji] = (reactions[emoji] ?? 0) + 1
          return { ...p, reactions, myReaction: emoji, likedByMe, likes }
        }),
      }))
      if (isCloud() && stateRef.current.authUserId) {
        void cloud.setReactionRemote(id, stateRef.current.authUserId, emoji).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
      }
    },
    [patch, t, toast],
  )

  const toggleSave = useCallback(
    (id: string) => {
      let nowSaved = false
      patch((s) => ({
        ...s,
        posts: s.posts.map((p) => {
          if (p.id !== id) return p
          nowSaved = !p.savedByMe
          return { ...p, savedByMe: nowSaved }
        }),
      }))
      toast(nowSaved ? t('post.saved') : t('post.unsave'))
    },
    [patch, t, toast],
  )

  const sharePost = useCallback(
    (id: string) => {
      patch((s) => ({ ...s, posts: s.posts.map((p) => (p.id === id ? { ...p, shares: p.shares + 1 } : p)) }))
      if (isCloud()) {
        void cloud.sharePostRemote(id).catch((e) => console.error(e))
      }
    },
    [patch],
  )

  const votePoll = useCallback(
    (postId: string, optionId: string) => {
      const already = stateRef.current.posts.find((p) => p.id === postId)?.votedOptionId
      if (already) return
      patch((s) => ({
        ...s,
        posts: s.posts.map((p) => {
          if (p.id !== postId || !p.poll || p.votedOptionId) return p
          return {
            ...p,
            votedOptionId: optionId,
            poll: {
              ...p.poll,
              options: p.poll.options.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o)),
            },
          }
        }),
      }))
      if (isCloud()) {
        void cloud.votePollRemote(postId, optionId).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
        void cloud.claimChallengeXpRemote(3).catch(() => {})
      } else {
        addXp(3)
      }
    },
    [addXp, patch, t, toast],
  )

  const addComment = useCallback(
    (postId: string, text: string, replyTo?: string) => {
      if (!state.authUserId || !text.trim()) return
      const meId = state.authUserId

      if (isCloud()) {
        void (async () => {
          try {
            const row = await cloud.createCommentRemote(postId, meId, text.trim(), replyTo)
            const comment = cloud.rowToComment(row, new Set<string>())
            patch((s) => {
              let next: PersistedState = {
                ...s,
                posts: s.posts.map((p) => {
                  if (p.id !== postId) return p
                  if (p.comments.some((c) => c.id === comment.id)) return p
                  if (!replyTo) return { ...p, comments: [comment, ...p.comments] }
                  return {
                    ...p,
                    comments: p.comments.map((c) => (c.id === replyTo ? { ...c, replies: [...c.replies, comment] } : c)),
                  }
                }),
                progress: { ...s.progress, comments: s.progress.comments + 1 },
                users: s.users.map((u) =>
                  u.id === meId ? { ...u, stats: { ...u.stats, comments: u.stats.comments + 1 } } : u,
                ),
              }
              next = evaluateBadges(next, meId)
              return next
            })
          } catch (e) {
            console.error(e)
            toast(t('common.errCloud'))
          }
        })()
        return
      }

      const comment: Comment = {
        id: uid('c'),
        authorId: state.authUserId,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        likes: 0,
        replies: [],
      }
      patch((s) => {
        let next: PersistedState = {
          ...s,
          posts: s.posts.map((p) => {
            if (p.id !== postId) return p
            if (!replyTo) return { ...p, comments: [comment, ...p.comments] }
            return {
              ...p,
              comments: p.comments.map((c) =>
                c.id === replyTo ? { ...c, replies: [...c.replies, comment] } : c,
              ),
            }
          }),
          progress: { ...s.progress, comments: s.progress.comments + 1 },
          users: s.users.map((u) => (u.id === s.authUserId ? { ...u, stats: { ...u.stats, comments: u.stats.comments + 1 } } : u)),
        }
        next = addXpRaw(next, 5)
        next = evaluateBadges(next, s.authUserId ?? "")
        return next
      })
    },
    [addXpRaw, evaluateBadges, patch, state.authUserId],
  )

  const toggleCommentLike = useCallback(
    (postId: string, commentId: string) => {
      patch((s) => ({
        ...s,
        posts: s.posts.map((p) => {
          if (p.id !== postId) return p
          const walk = (list: Comment[]): Comment[] =>
            list.map((c) => {
              if (c.id === commentId) {
                const liked = !c.likedByMe
                return { ...c, likedByMe: liked, likes: Math.max(0, c.likes + (liked ? 1 : -1)) }
              }
              return { ...c, replies: walk(c.replies) }
            })
          return { ...p, comments: walk(p.comments) }
        }),
      }))
      if (isCloud()) {
        void cloud.toggleCommentLikeRemote(commentId).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
      }
    },
    [patch, t, toast],
  )

  // ── Communities ────────────────────────────────────────────────────
  const toggleJoinCommunity = useCallback(
    (id: string) => {
      const community = stateRef.current.communities.find((c) => c.id === id)
      if (!community) return
      const joining = !community.joined
      if (community.visibility === 'private' && joining && !community.memberIds.includes(stateRef.current.authUserId ?? '')) {
        patch((s) => ({
          ...s,
          communities: s.communities.map((c) => (c.id === id ? { ...c, pending: true } : c)),
        }))
        toast(t('communities.joinRequest'))
        if (isCloud() && stateRef.current.authUserId) {
          void cloud.joinCommunityRemote(id, stateRef.current.authUserId, 'pending').catch((e) => {
            console.error(e)
            toast(t('common.errCloud'))
          })
        }
        return
      }
      patch((s) => ({
        ...s,
        communities: s.communities.map((c) =>
          c.id === id
            ? {
                ...c,
                joined: joining,
                pending: false,
                memberCount: Math.max(0, c.memberCount + (joining ? 1 : -1)),
                memberIds: joining
                  ? Array.from(new Set([...c.memberIds, s.authUserId ?? '']))
                  : c.memberIds.filter((m) => m !== s.authUserId),
              }
            : c,
        ),
      }))
      const meIdCloud = stateRef.current.authUserId
      if (isCloud() && meIdCloud) {
        void (joining
          ? cloud.joinCommunityRemote(id, meIdCloud, community.visibility === 'private' ? 'pending' : 'member')
          : cloud.leaveCommunityRemote(id, meIdCloud)
        ).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
      }
      if (joining) {
        toast(t('communities.joinedToast', { name: community.name }))
        if (!isCloud()) {
          const s0 = stateRef.current
          let next = s0
          next = addXpRaw(next, 10)
          next = evaluateBadges(next, s0.authUserId ?? '')
          patch(() => next)
        }
      } else {
        toast(t('communities.left'))
      }
    },
    [addXpRaw, evaluateBadges, patch, t, toast],
  )

  const createCommunity = useCallback(
    (data: {
      name: string
      description: string
      category: string
      visibility: 'public' | 'private'
      rules: string[]
      avatar: string
      banner: string
    }) => {
      const s0 = stateRef.current
      if (!s0.authUserId) return null
      const id = uid('cm')
      const slug = data.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const community: Community = {
        id,
        slug,
        name: data.name,
        avatar: data.avatar,
        banner: data.banner,
        description: data.description,
        rules: data.rules.length ? data.rules : ['Be respectful.', 'Stay on topic.', 'Credit photographers.'],
        category: data.category,
        visibility: data.visibility,
        memberCount: 1,
        memberIds: [s0.authUserId],
        adminIds: [s0.authUserId],
        modIds: [],
        joined: true,
        createdAt: new Date().toISOString(),
        challenges: [],
      }
      if (isCloud()) {
        void cloud
          .createCommunityRemote({ ...data, adminId: s0.authUserId })
          .then((remoteId) => {
            setState((s) =>
              s.communities.some((c) => c.id === remoteId)
                ? s
                : { ...s, communities: [{ ...community, id: remoteId }, ...s.communities] },
            )
            toast(t('communities.created'))
          })
          .catch((e) => {
            console.error(e)
            toast(t('common.errCloud'))
          })
        return null
      }
      let next: PersistedState = { ...s0, communities: [community, ...s0.communities] }
      next = addXpRaw(next, 25)
      next = evaluateBadges(next, s0.authUserId)
      setState(next)
      toast(t('communities.created'))
      return id
    },
    [addXpRaw, evaluateBadges, t, toast],
  )

  const joinChallenge = useCallback(
    (communityId: string, challengeId: string) => {
      patch((s) => ({
        ...s,
        communities: s.communities.map((c) =>
          c.id === communityId
            ? {
                ...c,
                challenges: c.challenges.map((ch) =>
                  ch.id === challengeId ? { ...ch, participants: ch.participants + 1 } : ch,
                ),
              }
            : c,
        ),
      }))
      toast(t('communities.challengeJoined'))
      if (isCloud()) {
        void cloud.claimChallengeXpRemote(5).catch((e) => console.error(e))
      } else {
        addXp(5)
      }
    },
    [addXp, patch, t, toast],
  )

  // ── Aircraft ───────────────────────────────────────────────────────
  const toggleFavoriteAircraft = useCallback(
    (id: string) => {
      const has = stateRef.current.favoriteAircraft.includes(id)
      patch((s) => ({
        ...s,
        favoriteAircraft: has ? s.favoriteAircraft.filter((x) => x !== id) : [...s.favoriteAircraft, id],
      }))
      toast(has ? t('aircraft.unfavorited') : t('aircraft.favorited'))
    },
    [patch, t, toast],
  )

  const createCollection = useCallback(
    (name: string, visibility: 'public' | 'private') => {
      const id = uid('col')
      patch((s) => ({
        ...s,
        collections: [...s.collections, { id, name, visibility, aircraftIds: [], createdAt: new Date().toISOString() }],
      }))
      toast(t('aircraft.collectionCreated'))
      return id
    },
    [patch, t, toast],
  )

  const addToCollection = useCallback(
    (collectionId: string, aircraftId: string) => {
      patch((s) => ({
        ...s,
        collections: s.collections.map((c) =>
          c.id === collectionId && !c.aircraftIds.includes(aircraftId)
            ? { ...c, aircraftIds: [...c.aircraftIds, aircraftId] }
            : c,
        ),
      }))
      const name = stateRef.current.collections.find((c) => c.id === collectionId)?.name ?? ''
      toast(t('aircraft.addedToCollection', { name }))
    },
    [patch, t, toast],
  )

  const removeFromCollection = useCallback(
    (collectionId: string, aircraftId: string) => {
      patch((s) => ({
        ...s,
        collections: s.collections.map((c) =>
          c.id === collectionId ? { ...c, aircraftIds: c.aircraftIds.filter((a) => a !== aircraftId) } : c,
        ),
      }))
    },
    [patch],
  )

  // ── Messaging ──────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (conversationId: string, msg: Partial<Message> & { kind: Message['kind'] }) => {
      if (!state.authUserId) return
      const message: Message = {
        id: uid('m'),
        senderId: state.authUserId,
        kind: msg.kind,
        text: msg.text,
        image: msg.image,
        postId: msg.postId,
        aircraftId: msg.aircraftId,
        createdAt: new Date().toISOString(),
      }
      patch((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === conversationId ? { ...c, messages: [...c.messages, message], unread: 0 } : c,
        ),
      }))
      if (isCloud() && stateRef.current.authUserId) {
        void cloud.sendMessageRemote(conversationId, stateRef.current.authUserId, msg).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
      }
    },
    [patch, state.authUserId, t, toast],
  )

  const markConversationRead = useCallback(
    (conversationId: string) => {
      patch((s) => ({
        ...s,
        conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
      }))
      if (isCloud() && stateRef.current.authUserId) {
        void cloud.markConversationReadRemote(conversationId, stateRef.current.authUserId).catch((e) =>
          console.error(e),
        )
      }
    },
    [patch],
  )

  const ensureConversationWith = useCallback(
    async (userId: string): Promise<string> => {
      const s0 = stateRef.current
      const existing = s0.conversations.find((c) => c.type === 'dm' && c.participantIds.includes(userId))
      if (existing) return existing.id
      if (isCloud()) {
        if (!s0.authUserId) return ''
        try {
          const id = await cloud.ensureConversationRemote(userId)
          patch((s) =>
            s.conversations.some((c) => c.id === id)
              ? s
              : {
                  ...s,
                  conversations: [
                    { id, type: 'dm' as const, participantIds: [userId, s.authUserId ?? ''], unread: 0, messages: [] },
                    ...s.conversations,
                  ],
                },
          )
          return id
        } catch (e) {
          console.error(e)
          toast(t('common.errCloud'))
          return ''
        }
      }
      const id = uid('cv')
      const conv: Conversation = {
        id,
        type: 'dm',
        participantIds: [userId, s0.authUserId ?? ''],
        unread: 0,
        messages: [],
      }
      patch((s) => ({ ...s, conversations: [conv, ...s.conversations] }))
      return id
    },
    [patch, t, toast],
  )

  // ── Notifications ──────────────────────────────────────────────────
  const markNotificationRead = useCallback(
    (id: string) => {
      patch((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
      if (isCloud() && stateRef.current.authUserId) {
        void cloud.markNotificationsReadRemote(stateRef.current.authUserId, [id]).catch((e) => console.error(e))
      }
    },
    [patch],
  )

  const markAllNotificationsRead = useCallback(() => {
    patch((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
    if (isCloud() && stateRef.current.authUserId) {
      void cloud.markNotificationsReadRemote(stateRef.current.authUserId).catch((e) => console.error(e))
    }
  }, [patch])

  const setPref = useCallback(
    (key: string, value: boolean) => {
      patch((s) => ({ ...s, prefs: { ...s.prefs, notify: { ...s.prefs.notify, [key]: value } } }))
    },
    [patch],
  )

  const setPrefValue = useCallback(
    (key: keyof Prefs, value: string) => {
      patch((s) => ({ ...s, prefs: { ...s.prefs, [key]: value } as Prefs }))
      toast(t('settings.saved'))
    },
    [patch, t, toast],
  )

  // ── Gamification ───────────────────────────────────────────────────
  const addQuizResult = useCallback(
    (mode: QuizMode, difficulty: Difficulty, score: number, total: number, xp: number) => {
      if (isCloud()) {
        void cloud.submitQuizRemote(mode, difficulty, score, total, xp).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
        patch((s) => {
          const user = s.users.find((u) => u.id === s.authUserId)
          if (!user) return s
          const record: QuizRecord = {
            id: uid('q'),
            userId: user.id,
            mode,
            difficulty,
            score,
            total,
            xp,
            playedAt: new Date().toISOString(),
          }
          let next: PersistedState = {
            ...s,
            quizRecords: [record, ...s.quizRecords].slice(0, 60),
            progress: { ...s.progress, quizzes: s.progress.quizzes + 1 },
            users: s.users.map((u) =>
              u.id === user.id
                ? {
                    ...u,
                    stats: {
                      ...u.stats,
                      quizzesPlayed: u.stats.quizzesPlayed + 1,
                      quizBestScore: Math.max(u.stats.quizBestScore, score),
                      quizWins: u.stats.quizWins + (score === total ? 1 : 0),
                    },
                  }
                : u,
            ),
          }
          next = evaluateBadges(next, user.id)
          return next
        })
        return
      }
      patch((s) => {
        const user = s.users.find((u) => u.id === s.authUserId)
        if (!user) return s
        const record: QuizRecord = {
          id: uid('q'),
          userId: user.id,
          mode,
          difficulty,
          score,
          total,
          xp,
          playedAt: new Date().toISOString(),
        }
        let next: PersistedState = {
          ...s,
          quizRecords: [record, ...s.quizRecords].slice(0, 60),
          progress: { ...s.progress, quizzes: s.progress.quizzes + 1 },
          users: s.users.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  stats: {
                    ...u.stats,
                    quizzesPlayed: u.stats.quizzesPlayed + 1,
                    quizBestScore: Math.max(u.stats.quizBestScore, score),
                    quizWins: u.stats.quizWins + (score === total ? 1 : 0),
                  },
                }
              : u,
          ),
        }
        next = addXpRaw(next, xp)
        next = evaluateBadges(next, user.id)
        return next
      })
    },
    [addXpRaw, evaluateBadges, patch, t, toast],
  )

  const claimChallenge = useCallback(
    (id: string, rewardXp: number) => {
      patch((s) => ({ ...s, claimedChallenges: [...s.claimedChallenges, id] }))
      if (isCloud()) {
        void cloud.claimChallengeXpRemote(rewardXp).catch((e) => {
          console.error(e)
          toast(t('common.errCloud'))
        })
      } else {
        addXp(rewardXp)
      }
      toast(t('quiz.xpEarned', { n: rewardXp }))
    },
    [addXp, patch, t, toast],
  )

  const report = useCallback(
    (targetType: ReportEntry['targetType'], targetId: string, reason: string, details?: string) => {
      const entry: ReportEntry = { id: uid('r'), targetType, targetId, reason, details, at: new Date().toISOString() }
      patch((s) => ({ ...s, reports: [entry, ...s.reports] }))
      if (isCloud() && stateRef.current.authUserId) {
        void cloud.reportRemote(stateRef.current.authUserId, targetType, targetId, reason, details).catch((e) =>
          console.error(e),
        )
      }
      toast(t('post.reportSent'))
    },
    [patch, t, toast],
  )

  const value = useMemo<StoreValue>(
    () => ({
      state,
      me,
      hydrated,
      theme,
      setTheme,
      lang,
      signIn,
      signUp,
      signOut,
      getUser,
      getUserByUsername,
      updateProfile,
      toggleFollow,
      isFollowing,
      sendFriendRequest,
      acceptFriend,
      declineFriend,
      removeFriend,
      isFriend,
      blockUser,
      unblockUser,
      addPost,
      deletePost,
      toggleLike,
      setReaction,
      toggleSave,
      sharePost,
      votePoll,
      addComment,
      toggleCommentLike,
      toggleJoinCommunity,
      createCommunity,
      joinChallenge,
      toggleFavoriteAircraft,
      createCollection,
      addToCollection,
      removeFromCollection,
      sendMessage,
      markConversationRead,
      ensureConversationWith,
      markNotificationRead,
      markAllNotificationsRead,
      setPref,
      setPrefValue,
      addXp,
      addQuizResult,
      claimChallenge,
      report,
      resetData,
    }),
    [
      state, me, hydrated, theme, setTheme, lang, signIn, signUp, signOut, getUser, getUserByUsername,
      updateProfile, toggleFollow, isFollowing, sendFriendRequest, acceptFriend, declineFriend, removeFriend,
      isFriend, blockUser, unblockUser, addPost, deletePost, toggleLike, setReaction, toggleSave, sharePost,
      votePoll, addComment, toggleCommentLike, toggleJoinCommunity, createCommunity, joinChallenge,
      toggleFavoriteAircraft, createCollection, addToCollection, removeFromCollection, sendMessage,
      markConversationRead, ensureConversationWith, markNotificationRead, markAllNotificationsRead, setPref,
      setPrefValue, addXp, addQuizResult, claimChallenge, report, resetData,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
