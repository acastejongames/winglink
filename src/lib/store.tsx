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
import { LEVEL_BADGES, RANK_NAMES, rankForLevel } from './gamification'
import { useI18n } from './i18n'
import { useToast } from '@/components/ui/Toast'

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
  ensureConversationWith: (userId: string) => string
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

  // Boot: unlock the vault with the per-tab session key (no password prompt on
  // reload while the tab lives). Without a session, start signed out with the
  // encrypted data left untouched on disk.
  useEffect(() => {
    let cancelled = false
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
  }, [])

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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('winglink.theme', theme)
  }, [theme])

  const setTheme = useCallback((t2: ThemeMode) => setThemeState(t2), [])

  const me = useMemo(() => state.users.find((u) => u.id === state.authUserId) ?? null, [state.users, state.authUserId])

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
        const name = t(`badge.${id}.name`)
        notifications.unshift({
          id: uid('n'),
          category: 'achievements',
          text: t('notifications.achievementUnlocked', { name }),
          createdAt: new Date().toISOString(),
          read: false,
        })
        toast(`🏅 ${name}`)
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
              text: t('notifications.levelUp', { rank: `${rank.icon} ${rankName}` }),
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...next.notifications,
          ],
        }
        toast(`🎉 ${t('notifications.levelUp', { rank: `${rank.icon} ${rankName}` })}`)
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
    dekRef.current = null
    clearSession()
    setState(freshState())
  }, [])

  const resetData = useCallback(() => {
    dekRef.current = null
    clearSession()
    localStorage.removeItem(VAULT_KEY)
    localStorage.removeItem(LEGACY_KEY)
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
      if (!wasFollowing) {
        const target = state.users.find((u) => u.id === userId)
        toast(t('common.following') + (target ? ` · ${target.displayName}` : ''))
        addXp(2)
      }
    },
    [addXp, patch, state.authUserId, state.following, state.users, t, toast],
  )

  const isFriend = useCallback((userId: string) => state.friends.includes(userId), [state.friends])

  const sendFriendRequest = useCallback(
    (userId: string) => {
      if (stateRef.current.friends.includes(userId) || stateRef.current.outgoingRequests.includes(userId)) return
      patch((s) => ({ ...s, outgoingRequests: [...s.outgoingRequests, userId] }))
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
      addXp(5)
    },
    [addXp, patch],
  )

  const declineFriend = useCallback(
    (userId: string) => {
      patch((s) => ({ ...s, incomingRequests: s.incomingRequests.filter((id) => id !== userId) }))
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
      toast(t('common.block') + ' ✓')
    },
    [patch, t, toast],
  )

  const unblockUser = useCallback(
    (userId: string) => {
      patch((s) => ({ ...s, blocked: s.blocked.filter((id) => id !== userId) }))
      toast(t('common.unblock') + ' ✓')
    },
    [patch, t, toast],
  )

  // ── Posts ──────────────────────────────────────────────────────────
  const addPost = useCallback(
    (draft: Partial<Post> & { text: string; type: Post['type'] }) => {
      if (!state.authUserId) return
      const hashtags = (draft.text.match(/#[\p{L}\p{N}_]+/gu) || []).map((m) => m.slice(1).toLowerCase())
      const mentions = (draft.text.match(/@[\w]+/g) || []).map((m) => m.slice(1).toLowerCase())
      const post: Post = {
        id: uid('p'),
        authorId: state.authUserId,
        type: draft.type,
        text: draft.text,
        images: draft.images,
        video: draft.video,
        poll: draft.poll,
        communityId: draft.communityId,
        visibility: draft.visibility ?? 'public',
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
    },
    [patch],
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
    },
    [patch],
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
      addXp(3)
    },
    [addXp, patch],
  )

  const addComment = useCallback(
    (postId: string, text: string, replyTo?: string) => {
      if (!state.authUserId || !text.trim()) return
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
    },
    [patch],
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
      if (joining) {
        toast(t('communities.joinedToast', { name: community.name }))
        const s0 = stateRef.current
        let next = s0
        next = addXpRaw(next, 10)
        next = evaluateBadges(next, s0.authUserId ?? '')
        patch(() => next)
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
      addXp(5)
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
    },
    [patch, state.authUserId],
  )

  const markConversationRead = useCallback(
    (conversationId: string) => {
      patch((s) => ({
        ...s,
        conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
      }))
    },
    [patch],
  )

  const ensureConversationWith = useCallback(
    (userId: string) => {
      const s0 = stateRef.current
      const existing = s0.conversations.find((c) => c.type === 'dm' && c.participantIds.includes(userId))
      if (existing) return existing.id
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
    [patch],
  )

  // ── Notifications ──────────────────────────────────────────────────
  const markNotificationRead = useCallback(
    (id: string) => {
      patch((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
    },
    [patch],
  )

  const markAllNotificationsRead = useCallback(() => {
    patch((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
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
    [addXpRaw, evaluateBadges, patch],
  )

  const claimChallenge = useCallback(
    (id: string, rewardXp: number) => {
      patch((s) => ({ ...s, claimedChallenges: [...s.claimedChallenges, id] }))
      addXp(rewardXp)
      toast(t('quiz.xpEarned', { n: rewardXp }))
    },
    [addXp, patch, t, toast],
  )

  const report = useCallback(
    (targetType: ReportEntry['targetType'], targetId: string, reason: string, details?: string) => {
      const entry: ReportEntry = { id: uid('r'), targetType, targetId, reason, details, at: new Date().toISOString() }
      patch((s) => ({ ...s, reports: [entry, ...s.reports] }))
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
