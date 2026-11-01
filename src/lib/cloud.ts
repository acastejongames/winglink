/**
 * WingLink cloud data access — every networked read/write against Supabase.
 * Row shapes (snake_case) are mapped to app types (camelCase) here so the UI
 * never sees database columns. All writes are guarded by RLS server-side;
 * this layer only performs optimistic UI on top (see store.tsx).
 */
import { sb } from './supabase'
import type {
  AppNotification,
  Comment,
  Community,
  Conversation,
  Difficulty,
  Message,
  Post,
  QuizMode,
  QuizRecord,
  User,
} from './types'

const failMsg = (e: unknown): string => (e as { message?: string })?.message ?? String(e)

// ── Mappers ─────────────────────────────────────────────────────────

export function rowToUser(r: Record<string, unknown>): User {
  return {
    id: r.id as string,
    username: r.username as string,
    displayName: (r.display_name as string) ?? '',
    bio: (r.bio as string) ?? '',
    avatar: (r.avatar_url as string) ?? '',
    cover: (r.cover_url as string) ?? 'images/f22-sunset.jpg',
    country: (r.country as string) ?? '',
    countryCode: (r.country_code as string) ?? '',
    interests: (r.interests as string[]) ?? [],
    identityTags: (r.identity_tags as string[]) ?? [],
    favoriteAircraft: (r.favorite_aircraft as string[]) ?? [],
    followers: (r.followers as number) ?? 0,
    following: (r.following as number) ?? 0,
    friends: (r.friends as number) ?? 0,
    postsCount: (r.posts_count as number) ?? 0,
    xp: (r.xp as number) ?? 0,
    badges: (r.badges as string[]) ?? [],
    frame: (r.frame as string) ?? 'none',
    visibility: (r.visibility as 'public' | 'private') ?? 'public',
    joinedAt: (r.created_at as string) ?? new Date().toISOString(),
    stats: (r.stats as User['stats']) ?? {
      posts: 0,
      likesReceived: 0,
      comments: 0,
      quizzesPlayed: 0,
      quizBestScore: 0,
      quizWins: 0,
      streak: 0,
    },
  }
}

export function rowToNotification(r: Record<string, unknown>): AppNotification {
  return {
    id: r.id as string,
    category: r.category as AppNotification['category'],
    actorId: r.actor_id as string | undefined,
    text: r.text as string,
    link: r.link as string | undefined,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    read: Boolean(r.read),
  }
}

export function rowToComment(
  r: Record<string, unknown>,
  likedSet: Set<string>,
): Comment {
  return {
    id: r.id as string,
    authorId: r.author_id as string,
    text: r.text as string,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    likes: (r.likes as number) ?? 0,
    likedByMe: likedSet.has(r.id as string),
    replies: [],
  }
}

interface FeedCtx {
  comments: Record<string, unknown>[]
  reactions: Record<string, unknown>[]
  commentLikes: Record<string, unknown>[]
  pollVotes: Record<string, unknown>[]
  meId: string
}

export function rowToPost(r: Record<string, unknown>, ctx: FeedCtx): Post {
  const id = r.id as string
  const reactions: Record<string, number> = {}
  for (const rx of ctx.reactions) {
    if (rx.post_id !== id) continue
    const e = rx.emoji as string
    reactions[e] = (reactions[e] ?? 0) + 1
  }
  const mine = ctx.reactions.find((rx) => rx.post_id === id && rx.user_id === ctx.meId)
  const myEmoji = (mine?.emoji as string | undefined) ?? null
  const likedSet = new Set(
    ctx.commentLikes.filter((cl) => cl.user_id === ctx.meId).map((cl) => cl.comment_id as string),
  )
  const postComments = ctx.comments
    .filter((c) => c.post_id === id)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((c) => rowToComment(c, likedSet))
  // one level of replies (reply_to → parent comment)
  const top = postComments.filter((c) => !ctx.comments.find((x) => x.id === c.id && x.reply_to))
  const withReplies = top.map((tc) => ({
    ...tc,
    replies: postComments
      .filter((pc) => ctx.comments.find((x) => x.id === pc.id)?.reply_to === tc.id)
      .reverse(),
  }))
  const pollRow = r.poll as { question: string; options: { id: string; text: string; votes: number }[]; endsAt: string } | null
  const myVote = ctx.pollVotes.find((v) => v.post_id === id && v.user_id === ctx.meId)
  return {
    id,
    authorId: r.author_id as string,
    type: r.type as Post['type'],
    text: (r.text as string) ?? '',
    images: (r.images as string[])?.length ? (r.images as string[]) : undefined,
    video: (r.video as Post['video']) ?? undefined,
    poll: pollRow
      ? {
          question: pollRow.question,
          endsAt: pollRow.endsAt,
          options: pollRow.options.map((o) => ({
            ...o,
            votes:
              (o.votes ?? 0) +
              (myVote && myVote.option_id === o.id ? 0 : 0),
          })),
        }
      : undefined,
    news: (r.news as Post['news']) ?? undefined,
    communityId: (r.community_id as string | null) ?? undefined,
    visibility: r.visibility as Post['visibility'],
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    likes: reactions['❤️'] ?? 0,
    shares: (r.shares as number) ?? 0,
    comments: withReplies,
    reactions,
    likedByMe: myEmoji === '❤️',
    savedByMe: false,
    myReaction: myEmoji,
    votedOptionId: (myVote?.option_id as string | undefined) ?? null,
    hashtags: (r.hashtags as string[]) ?? [],
    mentions: (r.mentions as string[]) ?? [],
  }
}

// ── Auth ────────────────────────────────────────────────────────────

export interface CloudAuthResult {
  ok: boolean
  error?: string
  /** Email confirmation required — account created, but not usable yet. */
  needsConfirm?: boolean
}

/** Map Supabase auth errors to i18n keys (never ship raw English). */
function authErrorKey(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'auth.errWrongPassword'
  if (m.includes('already registered') || m.includes('already been registered')) return 'auth.errUserTaken'
  if (m.includes('password')) return 'auth.errPassword'
  if (m.includes('confirm') || m.includes('verified')) return 'auth.confirmEmail'
  if (m.includes('rate') || m.includes('too many')) return 'auth.errTooMany'
  return 'auth.errCloud'
}

export async function cloudSignUp(data: {
  email: string
  password: string
  username: string
  displayName: string
  interests: string[]
}): Promise<CloudAuthResult> {
  const { data: res, error } = await sb().auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        username: data.username,
        display_name: data.displayName,
        interests: data.interests,
      },
    },
  })
  if (error) return { ok: false, error: authErrorKey(error.message) }
  if (!res.session) return { ok: true, needsConfirm: true }
  return { ok: true }
}

export async function cloudSignIn(email: string, password: string): Promise<CloudAuthResult> {
  const { error } = await sb().auth.signInWithPassword({ email, password })
  if (error) return { ok: false, error: authErrorKey(error.message) }
  return { ok: true }
}

export async function cloudSignOut(): Promise<void> {
  await sb().auth.signOut()
}

// ── Loads (bootstrap after sign-in) ─────────────────────────────────

export async function loadUsers(): Promise<User[]> {
  const { data, error } = await sb().from('profiles').select('*').limit(2000)
  if (error) throw new Error(failMsg(error))
  return (data ?? []).map(rowToUser)
}

export async function loadFeed(meId: string): Promise<Post[]> {
  const { data: posts, error } = await sb()
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(150)
  if (error) throw new Error(failMsg(error))
  const ids = (posts ?? []).map((p) => p.id as string)
  const empty: Post[] = []
  if (!ids.length) return empty
  const [comments, reactions, commentLikes, pollVotes] = await Promise.all([
    sb().from('comments').select('*').in('post_id', ids).limit(1000),
    sb().from('reactions').select('*').in('post_id', ids).limit(3000),
    sb().from('comment_likes').select('*').eq('user_id', meId).limit(3000),
    sb().from('poll_votes').select('*').eq('user_id', meId).limit(300),
  ])
  if (comments.error) throw new Error(failMsg(comments.error))
  if (reactions.error) throw new Error(failMsg(reactions.error))
  const ctx: FeedCtx = {
    comments: comments.data ?? [],
    reactions: reactions.data ?? [],
    commentLikes: commentLikes.data ?? [],
    pollVotes: pollVotes.data ?? [],
    meId,
  }
  return (posts ?? []).map((p) => rowToPost(p, ctx))
}

export interface SocialBundle {
  following: string[]
  friends: string[]
  incomingRequests: string[]
  outgoingRequests: string[]
  blocked: string[]
}

export async function loadSocial(meId: string): Promise<SocialBundle> {
  const [follows, friendReqs, friendships, blocks] = await Promise.all([
    sb().from('follows').select('followed_id').eq('follower_id', meId).limit(5000),
    sb().from('friend_requests').select('from_id,to_id').or(`from_id.eq.${meId},to_id.eq.${meId}`).limit(5000),
    sb().from('friendships').select('user_a,user_b').or(`user_a.eq.${meId},user_b.eq.${meId}`).limit(5000),
    sb().from('blocks').select('blocked_id').eq('blocker_id', meId).limit(5000),
  ])
  if (follows.error) throw new Error(failMsg(follows.error))
  const friendIds = new Set<string>()
  for (const f of friendReqs.data ?? []) {
    if (f.to_id === meId) friendIds.add(f.from_id)
  }
  for (const f of friendships.data ?? []) {
    friendIds.add(f.user_a === meId ? f.user_b : f.user_a)
  }
  return {
    following: (follows.data ?? []).map((f) => f.followed_id as string),
    friends: [...friendIds],
    incomingRequests: (friendReqs.data ?? [])
      .filter((r) => r.to_id === meId)
      .map((r) => r.from_id as string),
    outgoingRequests: (friendReqs.data ?? [])
      .filter((r) => r.from_id === meId)
      .map((r) => r.to_id as string),
    blocked: (blocks.data ?? []).map((b) => b.blocked_id as string),
  }
}

export async function loadCommunities(meId: string): Promise<Community[]> {
  const [comms, members] = await Promise.all([
    sb().from('communities').select('*').order('created_at', { ascending: false }).limit(500),
    sb().from('community_members').select('*').limit(5000),
  ])
  if (comms.error) throw new Error(failMsg(comms.error))
  const memberRows = members.data ?? []
  return (comms.data ?? []).map((c) => {
    const rows = memberRows.filter((m) => m.community_id === c.id)
    const mine = rows.find((m) => m.user_id === meId)
    return {
      id: c.id as string,
      slug: c.slug as string,
      name: c.name as string,
      avatar: (c.avatar as string) ?? '',
      banner: (c.banner as string) ?? 'images/f22-sunset.jpg',
      description: (c.description as string) ?? '',
      rules: (c.rules as string[]) ?? [],
      category: (c.category as string) ?? 'general',
      visibility: c.visibility as 'public' | 'private',
      memberCount: (c.member_count as number) ?? rows.length,
      memberIds: rows.filter((m) => m.status === 'member').map((m) => m.user_id as string),
      adminIds: (c.admin_ids as string[]) ?? [],
      modIds: (c.mod_ids as string[]) ?? [],
      joined: mine?.status === 'member',
      pending: mine?.status === 'pending',
      createdAt: (c.created_at as string) ?? new Date().toISOString(),
      challenges: [],
    }
  })
}

export async function loadConversations(meId: string): Promise<Conversation[]> {
  const [myMembers, allMembers, convs, msgs] = await Promise.all([
    sb().from('conversation_members').select('conversation_id,last_read_at').eq('user_id', meId).limit(500),
    sb().from('conversation_members').select('conversation_id,user_id').limit(5000),
    sb().from('conversations').select('*').limit(500),
    sb().from('messages').select('*').order('created_at', { ascending: true }).limit(1000),
  ])
  if (myMembers.error) throw new Error(failMsg(myMembers.error))
  const myIds = new Set((myMembers.data ?? []).map((m) => m.conversation_id as string))
  const readAt = new Map(
    (myMembers.data ?? []).map((m) => [m.conversation_id as string, m.last_read_at as string]),
  )
  const convRows = (convs.data ?? []).filter((c) => myIds.has(c.id as string))
  const msgRows = msgs.data ?? []
  const memberRows = allMembers.data ?? []
  return convRows.map((c) => {
    const id = c.id as string
    const messages: Message[] = msgRows
      .filter((m) => m.conversation_id === id)
      .map((m) => ({
        id: m.id as string,
        senderId: m.sender_id as string,
        kind: m.kind as Message['kind'],
        text: (m.text as string | null) ?? undefined,
        image: (m.image as string | null) ?? undefined,
        postId: (m.post_id as string | null) ?? undefined,
        aircraftId: (m.aircraft_id as string | null) ?? undefined,
        createdAt: m.created_at as string,
      }))
    const lastRead = readAt.get(id) ?? ''
    const unread = messages.filter((m) => m.senderId !== meId && m.createdAt > lastRead).length
    return {
      id,
      type: c.type as Conversation['type'],
      name: (c.name as string | null) ?? undefined,
      avatar: (c.avatar as string | null) ?? undefined,
      communityId: (c.community_id as string | null) ?? undefined,
      participantIds: memberRows.filter((m) => m.conversation_id === id).map((m) => m.user_id as string),
      messages,
      unread,
    }
  })
}

export async function loadNotifications(meId: string): Promise<AppNotification[]> {
  const { data, error } = await sb()
    .from('notifications')
    .select('*')
    .eq('user_id', meId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(failMsg(error))
  return (data ?? []).map(rowToNotification)
}

export async function loadQuizRecords(): Promise<QuizRecord[]> {
  const { data, error } = await sb()
    .from('quiz_records')
    .select('*')
    .order('played_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(failMsg(error))
  return (data ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    mode: r.mode as QuizMode,
    difficulty: r.difficulty as Difficulty,
    score: r.score as number,
    total: r.total as number,
    xp: r.xp as number,
    playedAt: r.played_at as string,
  }))
}

// ── Mutations ───────────────────────────────────────────────────────

export async function createPostRemote(draft: {
  authorId: string
  type: string
  text: string
  images?: string[]
  video?: Post['video']
  poll?: Post['poll']
  communityId?: string
  visibility: string
  hashtags: string[]
  mentions: string[]
}): Promise<string> {
  const { data, error } = await sb()
    .from('posts')
    .insert({
      author_id: draft.authorId,
      type: draft.type,
      text: draft.text,
      images: draft.images ?? [],
      video: draft.video ?? null,
      poll: draft.poll ?? null,
      community_id: draft.communityId ?? null,
      visibility: draft.visibility,
      hashtags: draft.hashtags,
      mentions: draft.mentions,
    })
    .select('id')
    .single()
  if (error) throw new Error(failMsg(error))
  return data.id as string
}

export async function deletePostRemote(id: string): Promise<void> {
  const { error } = await sb().from('posts').delete().eq('id', id)
  if (error) throw new Error(failMsg(error))
}

export async function setReactionRemote(postId: string, meId: string, emoji: string | null): Promise<void> {
  if (!emoji) {
    const { error } = await sb().from('reactions').delete().eq('post_id', postId).eq('user_id', meId)
    if (error) throw new Error(failMsg(error))
    return
  }
  const { error } = await sb()
    .from('reactions')
    .upsert({ post_id: postId, user_id: meId, emoji }, { onConflict: 'post_id,user_id' })
  if (error) throw new Error(failMsg(error))
}

export async function createCommentRemote(
  postId: string,
  meId: string,
  text: string,
  replyTo?: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await sb()
    .from('comments')
    .insert({ post_id: postId, author_id: meId, text, reply_to: replyTo ?? null })
    .select('*')
    .single()
  if (error) throw new Error(failMsg(error))
  return data
}

export async function toggleCommentLikeRemote(commentId: string): Promise<void> {
  const { error } = await sb().rpc('toggle_comment_like', { p_comment: commentId })
  if (error) throw new Error(failMsg(error))
}

export async function followRemote(targetId: string, meId: string): Promise<void> {
  const { error } = await sb().from('follows').insert({ follower_id: meId, followed_id: targetId })
  if (error && !error.message.includes('duplicate')) throw new Error(failMsg(error))
}

export async function unfollowRemote(targetId: string, meId: string): Promise<void> {
  const { error } = await sb().from('follows').delete().eq('follower_id', meId).eq('followed_id', targetId)
  if (error) throw new Error(failMsg(error))
}

export async function sendFriendRequestRemote(fromId: string, toId: string): Promise<void> {
  const { error } = await sb().from('friend_requests').insert({ from_id: fromId, to_id: toId })
  if (error && !error.message.includes('duplicate')) throw new Error(failMsg(error))
}

export async function acceptFriendRemote(fromId: string, toId: string): Promise<void> {
  const [a, b] = fromId < toId ? [fromId, toId] : [toId, fromId]
  const { error: del } = await sb().from('friend_requests').delete().eq('from_id', fromId).eq('to_id', toId)
  if (del) throw new Error(failMsg(del))
  const { error } = await sb().from('friendships').insert({ user_a: a, user_b: b })
  if (error && !error.message.includes('duplicate')) throw new Error(failMsg(error))
}

export async function declineFriendRemote(fromId: string, toId: string): Promise<void> {
  const { error } = await sb().from('friend_requests').delete().eq('from_id', fromId).eq('to_id', toId)
  if (error) throw new Error(failMsg(error))
}

export async function removeFriendRemote(meId: string, otherId: string): Promise<void> {
  const [a, b] = meId < otherId ? [meId, otherId] : [otherId, meId]
  const { error } = await sb().from('friendships').delete().eq('user_a', a).eq('user_b', b)
  if (error) throw new Error(failMsg(error))
}

export async function blockRemote(meId: string, targetId: string): Promise<void> {
  const { error } = await sb().from('blocks').insert({ blocker_id: meId, blocked_id: targetId })
  if (error && !error.message.includes('duplicate')) throw new Error(failMsg(error))
  await sb().from('follows').delete().or(
    `and(follower_id.${meId},followed_id.${targetId}),and(follower_id.${targetId},followed_id.${meId})`,
  )
  const [a, b] = meId < targetId ? [meId, targetId] : [targetId, meId]
  await sb().from('friendships').delete().eq('user_a', a).eq('user_b', b)
  await sb()
    .from('friend_requests')
    .delete()
    .or(`and(from_id.${meId},to_id.${targetId}),and(from_id.${targetId},to_id.${meId})`)
}

export async function unblockRemote(meId: string, targetId: string): Promise<void> {
  const { error } = await sb().from('blocks').delete().eq('blocker_id', meId).eq('blocked_id', targetId)
  if (error) throw new Error(failMsg(error))
}

export async function joinCommunityRemote(communityId: string, meId: string, status: 'member' | 'pending'): Promise<void> {
  const { error } = await sb()
    .from('community_members')
    .insert({ community_id: communityId, user_id: meId, status, role: 'member' })
  if (error && !error.message.includes('duplicate')) throw new Error(failMsg(error))
}

export async function leaveCommunityRemote(communityId: string, meId: string): Promise<void> {
  const { error } = await sb()
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', meId)
  if (error) throw new Error(failMsg(error))
}

export async function approveMemberRemote(communityId: string, userId: string): Promise<void> {
  const { error } = await sb()
    .from('community_members')
    .update({ status: 'member' })
    .eq('community_id', communityId)
    .eq('user_id', userId)
  if (error) throw new Error(failMsg(error))
}

export async function createCommunityRemote(data: {
  name: string
  description: string
  category: string
  visibility: 'public' | 'private'
  rules: string[]
  avatar: string
  banner: string
  adminId: string
}): Promise<string> {
  const slug =
    data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'community'
  const { data: row, error } = await sb()
    .from('communities')
    .insert({
      slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
      name: data.name,
      description: data.description,
      category: data.category,
      visibility: data.visibility,
      rules: data.rules,
      avatar: data.avatar,
      banner: data.banner,
      admin_ids: [data.adminId],
      mod_ids: [],
      member_count: 0,
    })
    .select('id')
    .single()
  if (error) throw new Error(failMsg(error))
  // The admin membership row is created by the server trigger (see schema.sql).
  return row.id as string
}

export async function sendMessageRemote(
  conversationId: string,
  meId: string,
  msg: Partial<Message> & { kind: Message['kind'] },
): Promise<void> {
  const { error } = await sb().from('messages').insert({
    conversation_id: conversationId,
    sender_id: meId,
    kind: msg.kind,
    text: msg.text ?? null,
    image: msg.image ?? null,
    post_id: msg.postId ?? null,
    aircraft_id: msg.aircraftId ?? null,
  })
  if (error) throw new Error(failMsg(error))
}

export async function ensureConversationRemote(otherId: string): Promise<string> {
  const { data, error } = await sb().rpc('ensure_dm', { p_other: otherId })
  if (error) throw new Error(failMsg(error))
  return data as string
}

export async function markConversationReadRemote(conversationId: string, meId: string): Promise<void> {
  const { error } = await sb()
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', meId)
  if (error) throw new Error(failMsg(error))
}

export async function markNotificationsReadRemote(meId: string, ids?: string[]): Promise<void> {
  let q = sb().from('notifications').update({ read: true }).eq('user_id', meId)
  if (ids?.length) q = q.in('id', ids)
  const { error } = await q
  if (error) throw new Error(failMsg(error))
}

export async function updateProfileRemote(meId: string, patch: Record<string, unknown>): Promise<void> {
  const cols: Record<string, unknown> = {}
  const map: Record<string, string> = {
    displayName: 'display_name',
    bio: 'bio',
    avatar: 'avatar_url',
    cover: 'cover_url',
    country: 'country',
    countryCode: 'country_code',
    interests: 'interests',
    identityTags: 'identity_tags',
    favoriteAircraft: 'favorite_aircraft',
    frame: 'frame',
    visibility: 'visibility',
    badges: 'badges',
    stats: 'stats',
  }
  for (const [k, v] of Object.entries(patch)) {
    if (k in map && v !== undefined) cols[map[k]] = v
  }
  if (!Object.keys(cols).length) return
  const { error } = await sb().from('profiles').update(cols).eq('id', meId)
  if (error) throw new Error(failMsg(error))
}

export async function submitQuizRemote(
  mode: QuizMode,
  difficulty: Difficulty,
  score: number,
  total: number,
  xp: number,
): Promise<void> {
  const { error } = await sb().rpc('submit_quiz', {
    p_mode: mode,
    p_difficulty: difficulty,
    p_score: score,
    p_total: total,
    p_xp: xp,
  })
  if (error) throw new Error(failMsg(error))
}

export async function claimChallengeXpRemote(amount: number): Promise<void> {
  const { error } = await sb().rpc('claim_challenge_xp', { p_amount: amount })
  if (error) throw new Error(failMsg(error))
}

export async function sharePostRemote(postId: string): Promise<void> {
  const { error } = await sb().rpc('bump_share', { p_post: postId })
  if (error) throw new Error(failMsg(error))
}

export async function votePollRemote(postId: string, optionId: string): Promise<void> {
  const { error } = await sb().rpc('vote_poll', { p_post: postId, p_option: optionId })
  if (error) throw new Error(failMsg(error))
}

export async function reportRemote(
  meId: string,
  targetType: string,
  targetId: string,
  reason: string,
  details?: string,
): Promise<void> {
  const { error } = await sb()
    .from('reports')
    .insert({ reporter_id: meId, target_type: targetType, target_id: targetId, reason, details: details ?? null })
  if (error) throw new Error(failMsg(error))
}

// ── Realtime ────────────────────────────────────────────────────────

/** Reload one post's reactions (realtime DELETE payloads omit the emoji). */
export async function loadPostReactions(
  postId: string,
  meId: string,
): Promise<{ reactions: Record<string, number>; likes: number; myReaction: string | null }> {
  const { data, error } = await sb().from('reactions').select('*').eq('post_id', postId).limit(500)
  if (error) throw new Error(failMsg(error))
  const reactions: Record<string, number> = {}
  for (const r of data ?? []) {
    const e = r.emoji as string
    reactions[e] = (reactions[e] ?? 0) + 1
  }
  const mine = (data ?? []).find((r) => r.user_id === meId)
  return { reactions, likes: reactions['❤️'] ?? 0, myReaction: (mine?.emoji as string) ?? null }
}

/** Fetch a single profile (e.g. author of a post arriving over realtime). */
export async function loadUserRemote(id: string): Promise<User | null> {
  const { data, error } = await sb().from('profiles').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return rowToUser(data)
}

export interface RealtimeHandlers {
  onPostInsert?: (row: Record<string, unknown>) => void
  onPostDelete?: (old: Record<string, unknown>) => void
  onReactionInsert?: (row: Record<string, unknown>) => void
  onReactionDelete?: (old: Record<string, unknown>) => void
  onCommentInsert?: (row: Record<string, unknown>) => void
  onCommentLikeChange?: (row: Record<string, unknown>, op: 'INSERT' | 'DELETE') => void
  onFollowChange?: (row: Record<string, unknown>, op: 'INSERT' | 'DELETE') => void
  onMessageInsert?: (row: Record<string, unknown>) => void
  onNotificationInsert?: (row: Record<string, unknown>) => void
  onProfileChange?: (row: Record<string, unknown>) => void
  onFriendRequestInsert?: (row: Record<string, unknown>) => void
  onFriendshipChange?: (row: Record<string, unknown>, op: 'INSERT' | 'DELETE') => void
  onCommunityChange?: (row: Record<string, unknown>) => void
  onCommunityMemberChange?: (row: Record<string, unknown>, op: 'INSERT' | 'UPDATE' | 'DELETE') => void
}

/** Subscribe to live changes; RLS filters rows to what this user may see. */
export function subscribeCloud(h: RealtimeHandlers): () => void {
  // private: true → Realtime authorizes via RLS for every event, so DMs and
  // private communities never leak to browsers that shouldn't see them.
  const ch = sb().channel(`wl-${Math.random().toString(36).slice(2, 8)}`, {
    config: { private: true },
  })
  const on = (table: string, fn: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void) => {
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      fn as never,
    )
  }
  on('posts', (p) => {
    if (p.eventType === 'INSERT') h.onPostInsert?.(p.new)
    else if (p.eventType === 'DELETE') h.onPostDelete?.(p.old)
  })
  on('reactions', (p) => {
    if (p.eventType === 'INSERT') h.onReactionInsert?.(p.new)
    else if (p.eventType === 'DELETE') h.onReactionDelete?.(p.old)
  })
  on('comments', (p) => {
    if (p.eventType === 'INSERT') h.onCommentInsert?.(p.new)
  })
  on('comment_likes', (p) => {
    if (p.eventType === 'INSERT' || p.eventType === 'DELETE')
      h.onCommentLikeChange?.(p.eventType === 'DELETE' ? p.old : p.new, p.eventType as 'INSERT' | 'DELETE')
  })
  on('follows', (p) => {
    if (p.eventType === 'INSERT' || p.eventType === 'DELETE')
      h.onFollowChange?.(p.eventType === 'DELETE' ? p.old : p.new, p.eventType as 'INSERT' | 'DELETE')
  })
  on('messages', (p) => {
    if (p.eventType === 'INSERT') h.onMessageInsert?.(p.new)
  })
  on('notifications', (p) => {
    if (p.eventType === 'INSERT') h.onNotificationInsert?.(p.new)
  })
  on('profiles', (p) => {
    if (p.eventType === 'UPDATE' || p.eventType === 'INSERT') h.onProfileChange?.(p.new)
  })
  on('friend_requests', (p) => {
    if (p.eventType === 'INSERT') h.onFriendRequestInsert?.(p.new)
  })
  on('friendships', (p) => {
    if (p.eventType === 'INSERT' || p.eventType === 'DELETE')
      h.onFriendshipChange?.(p.eventType === 'DELETE' ? p.old : p.new, p.eventType as 'INSERT' | 'DELETE')
  })
  on('communities', (p) => {
    if (p.eventType === 'INSERT' || p.eventType === 'UPDATE') h.onCommunityChange?.(p.new)
  })
  on('community_members', (p) => {
    if (p.eventType !== 'SELECT')
      h.onCommunityMemberChange?.(p.eventType === 'DELETE' ? p.old : p.new, p.eventType as 'INSERT' | 'UPDATE' | 'DELETE')
  })
  ch.subscribe()
  return () => {
    void sb().removeChannel(ch)
  }
}
