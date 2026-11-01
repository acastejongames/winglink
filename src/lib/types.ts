export type ID = string

export type ThemeMode = 'dark' | 'light'
export type Language = 'en' | 'es'
export type Visibility = 'public' | 'private'

export type RankId =
  | 'cadet'
  | 'aviator'
  | 'first-officer'
  | 'captain'
  | 'squadron-leader'
  | 'wing-commander'
  | 'air-marshal'

export interface Rank {
  id: RankId
  minLevel: number
  icon: string
}

export interface BadgeDef {
  id: string
  icon: string
  name: string
  nameEs: string
  desc: string
  descEs: string
}

export interface UserStats {
  posts: number
  likesReceived: number
  comments: number
  quizzesPlayed: number
  quizBestScore: number
  quizWins: number
  streak: number
}

export interface User {
  id: ID
  username: string
  email?: string
  displayName: string
  bio: string
  avatar: string
  cover: string
  country: string
  countryCode: string
  city?: string
  interests: string[]
  identityTags: string[]
  favoriteAircraft: string[]
  followers: number
  following: number
  friends: number
  postsCount: number
  xp: number
  badges: string[]
  frame: string
  visibility: Visibility
  joinedAt: string
  /** Local account credential check (client-side; replaced by Supabase auth when connected). */
  passHash?: string
  stats: UserStats
}

export type PostType = 'text' | 'image' | 'carousel' | 'album' | 'video' | 'poll' | 'question' | 'news'

export interface PollOption {
  id: string
  text: string
  votes: number
}

export interface Poll {
  question: string
  options: PollOption[]
  endsAt: string
}

export interface Comment {
  id: ID
  authorId: ID
  text: string
  createdAt: string
  likes: number
  likedByMe?: boolean
  replies: Comment[]
}

export interface NewsMeta {
  source: string
  headline: string
}

export interface Post {
  id: ID
  authorId: ID
  type: PostType
  text: string
  images?: string[]
  video?: { poster: string; duration: string }
  poll?: Poll
  news?: NewsMeta
  communityId?: ID
  visibility: 'public' | 'followers' | 'community'
  createdAt: string
  likes: number
  shares: number
  comments: Comment[]
  reactions: Record<string, number>
  likedByMe?: boolean
  savedByMe?: boolean
  myReaction?: string | null
  votedOptionId?: string | null
  hashtags: string[]
  mentions: string[]
}

export interface CommunityChallenge {
  id: ID
  title: string
  description: string
  endsAt: string
  participants: number
}

export interface Community {
  id: ID
  slug: string
  name: string
  avatar: string
  banner: string
  description: string
  rules: string[]
  category: string
  visibility: 'public' | 'private'
  memberCount: number
  memberIds: ID[]
  adminIds: ID[]
  modIds: ID[]
  joined: boolean
  pending?: boolean
  createdAt: string
  challenges: CommunityChallenge[]
}

export type AircraftCategory =
  | 'fighter'
  | 'bomber'
  | 'commercial'
  | 'transport'
  | 'helicopter'
  | 'historical'
  | 'general-aviation'
  | 'trainer'
  | 'experimental'
  | 'uav'
  | 'aerospace'

export interface AircraftSpecs {
  topSpeed?: string
  range?: string
  ceiling?: string
  length?: string
  wingspan?: string
  rotorDiameter?: string
  firstFlight?: string
  crew?: string
  engines?: string
  production?: string
}

export interface Aircraft {
  id: ID
  name: string
  manufacturer: string
  country: string
  countryCode: string
  category: AircraftCategory
  image: string
  year: number
  description: string
  specs: AircraftSpecs
  variants: string[]
  related: ID[]
}

export interface AircraftCollection {
  id: ID
  name: string
  visibility: Visibility
  aircraftIds: ID[]
  createdAt: string
}

export type MessageKind = 'text' | 'image' | 'post' | 'aircraft'

export interface Message {
  id: ID
  senderId: ID
  kind: MessageKind
  text?: string
  image?: string
  postId?: ID
  aircraftId?: ID
  createdAt: string
}

export interface Conversation {
  id: ID
  type: 'dm' | 'group' | 'community'
  name?: string
  avatar?: string
  participantIds: ID[]
  communityId?: ID
  messages: Message[]
  unread: number
}

export type NotificationCategory =
  | 'followers'
  | 'friends'
  | 'reactions'
  | 'comments'
  | 'mentions'
  | 'communities'
  | 'messages'
  | 'challenges'
  | 'achievements'

export interface AppNotification {
  id: ID
  category: NotificationCategory
  actorId?: ID
  text: string
  createdAt: string
  read: boolean
  link?: string
}

export type QuizMode =
  | 'aircraft'
  | 'manufacturer'
  | 'cockpit'
  | 'silhouette'
  | 'country'
  | 'trivia'
  | 'history'
  | 'comparison'

export type Difficulty = 'easy' | 'medium' | 'hard'

interface BaseQuestion {
  id: ID
  mode: QuizMode
  difficulty: Difficulty
  fact: string
  factEs?: string
}

export interface ImageQuestion extends BaseQuestion {
  mode: 'aircraft' | 'manufacturer' | 'cockpit' | 'silhouette' | 'country'
  image: string
  prompt: string
  promptEs?: string
  options: string[]
  answer: number
}

export interface TextQuestion extends BaseQuestion {
  mode: 'trivia' | 'history'
  prompt: string
  promptEs?: string
  options: string[]
  answer: number
}

export interface ComparisonQuestion extends BaseQuestion {
  mode: 'comparison'
  prompt: string
  promptEs?: string
  left: { name: string; image: string; value: string }
  right: { name: string; image: string; value: string }
  answer: 0 | 1
}

export type QuizQuestion = ImageQuestion | TextQuestion | ComparisonQuestion

export interface QuizRecord {
  id: ID
  userId: ID
  mode: QuizMode
  difficulty: Difficulty
  score: number
  total: number
  xp: number
  playedAt: string
}

export interface GlobalLeaderRow {
  userId: ID
  score: number
}

export interface SeasonalChallenge {
  id: ID
  title: string
  description: string
  target: number
  metric: 'posts' | 'quizzes' | 'comments' | 'xp'
  rewardXp: number
}
