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
import { hashPassword, levelFromXp, uid } from './utils'
import { LEVEL_BADGES, RANK_NAMES, rankForLevel } from './gamification'
import { useI18n } from './i18n'
import { useToast } from '@/components/ui/Toast'

// v2: public launch — starts from a clean slate (v1 seed data is never loaded)
const STORAGE_KEY = 'winglink.state.v2'

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

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (!parsed || typeof parsed !== 'object') return freshState()
    return {
      ...freshState(),
      ...(parsed as PersistedState),
      prefs: { ...defaultPrefs, ...parsed.prefs, notify: { ...defaultPrefs.notify, ...parsed.prefs?.notify } },
    }
  } catch {
    return freshState()
  }
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded — drop oversized local media from the oldest uploads and retry once.
    try {
      const trimmed: PersistedState = {
        ...state,
        posts: state.posts.map((p) => ({
          ...p,
          images: p.images?.map((img) => (img.startsWith('data:') ? 'images/f22-sky.jpg' : img)),
        })),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      /* give up silently — in-memory session still works */
    }
  }
}

interface StoreValue {
  state: PersistedState
  me: User | null
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  lang: Language
  // auth
  signIn: (email: string, password: string) => { ok: boolean; error?: string }
  signUp: (data: { email: string; username: string; displayName: string; password: string; interests: string[] }) => { ok: boolean; error?: string }
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
  const [state, setState] = useState<PersistedState>(loadState)
  const [theme, setThemeState] = useState<ThemeMode>(() => (localStorage.getItem('winglink.theme') === 'light' ? 'light' : 'dark'))
  const { t, lang } = useI18n()
  const { toast } = useToast()
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    saveState(state)
  }, [state])

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
    (email: string, password: string) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: t('auth.errEmail') }
      if (password.length < 8) return { ok: false, error: t('auth.errPassword') }
      const local = stateRef.current.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
      if (!local) return { ok: false, error: t('auth.errNoAccount') }
      if (local.passHash !== undefined && local.passHash !== hashPassword(password)) {
        return { ok: false, error: t('auth.errWrongPassword') }
      }
      patch((s) => ({ ...s, authUserId: local.id }))
      toast(t('auth.signedIn'))
      return { ok: true }
    },
    [patch, t, toast],
  )

  const signUp = useCallback(
    (data: { email: string; username: string; displayName: string; password: string; interests: string[] }) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { ok: false, error: t('auth.errEmail') }
      if (data.password.length < 8) return { ok: false, error: t('auth.errPassword') }
      if (!/^[a-z0-9_]{3,20}$/i.test(data.username)) return { ok: false, error: t('auth.errUsername') }
      if (!data.displayName.trim()) return { ok: false, error: t('auth.errName') }
      const taken = stateRef.current.users.some((u) => u.username === data.username.toLowerCase())
      if (taken) return { ok: false, error: t('auth.errUserTaken') }
      const id = 'u_me'
      const newUser: User = {
        id,
        username: data.username.toLowerCase(),
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
        passHash: hashPassword(data.password),
        stats: { posts: 0, likesReceived: 0, comments: 0, quizzesPlayed: 0, quizBestScore: 0, quizWins: 0, streak: 0 },
      }
      patch((s) => {
        const users = s.users.some((u) => u.id === id) ? s.users.map((u) => (u.id === id ? newUser : u)) : [...s.users, newUser]
        return { ...s, users, authUserId: id }
      })
      toast(t('auth.welcome', { name: newUser.displayName }))
      return { ok: true }
    },
    [patch, t, toast],
  )

  const signOut = useCallback(() => {
    patch((s) => ({ ...s, authUserId: null }))
  }, [patch])

  const resetData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
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
      state, me, theme, setTheme, lang, signIn, signUp, signOut, getUser, getUserByUsername,
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
