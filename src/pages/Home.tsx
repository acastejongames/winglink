import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Compass, Sparkles, TrendingUp, UserPlus, Users, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { PostCard } from '@/components/feed/PostCard'
import { PostComposer } from '@/components/feed/PostComposer'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge, Button, Card, EmptyState, Tabs } from '@/components/ui/Primitives'
import { SectionHeader } from '@/components/RichText'
import { trendingHashtags, trendingTopics } from '@/lib/demo/posts'
import { formatCount } from '@/lib/utils'
import { seasonalChallenges } from '@/lib/demo/quiz'
import { rankForLevel, RANK_NAMES } from '@/lib/gamification'

export default function Home() {
  const { t, lang } = useI18n()
  const { state, me, isFollowing, toggleFollow, acceptFriend, declineFriend, getUser } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('following')

  const visiblePosts = useMemo(() => {
    const posts = state.posts.filter((p) => {
      if (state.blocked.includes(p.authorId)) return false
      const author = state.users.find((u) => u.id === p.authorId)
      if (author?.visibility === 'private' && p.authorId !== me?.id && !state.following.includes(p.authorId)) return false
      return true
    })
    if (tab === 'following') {
      return posts.filter((p) => state.following.includes(p.authorId) || p.authorId === me?.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    }
    if (tab === 'communities') {
      const joined = state.communities.filter((c) => c.joined).map((c) => c.id)
      return posts.filter((p) => p.communityId && joined.includes(p.communityId)).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    }
    return [...posts].sort((a, b) => b.likes + b.comments.length * 3 - (a.likes + a.comments.length * 3))
  }, [tab, state.posts, state.following, state.blocked, state.communities, state.users, me?.id])

  const suggested = state.users
    .filter((u) => u.id !== me?.id && !isFollowing(u.id) && !state.blocked.includes(u.id))
    .slice(0, 5)
  const incoming = state.incomingRequests.map((id) => getUser(id)).filter(Boolean)

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">{t('home.title')}</h1>
          {me && (
            <span className="text-sm text-cloud-500">
              {t('profile.level', { n: Math.floor(Math.sqrt(me.xp / 120)) + 1 })} ·{' '}
              {(() => {
                const r = rankForLevel(Math.floor(Math.sqrt(me.xp / 120)) + 1)
                return `${r.icon} ${RANK_NAMES[r.id][lang]}`
              })()}
            </span>
          )}
        </div>

        <PostComposer />

        <div className="my-4">
          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'following', label: t('home.tabFollowing') },
              { id: 'recommended', label: t('home.tabRecommended') },
              { id: 'communities', label: t('home.tabCommunities') },
            ]}
          />
        </div>

        <div className="space-y-4">
          {visiblePosts.length === 0 ? (
            <EmptyState
              icon={tab === 'communities' ? <Users className="h-8 w-8" /> : <Compass className="h-8 w-8" />}
              title={tab === 'following' ? t('home.emptyFollowing') : tab === 'communities' ? t('home.emptyCommunities') : t('home.emptyRecommended')}
              action={
                <Button onClick={() => navigate('/explore')}>
                  <Sparkles className="h-4 w-4" />
                  {t('home.exploreCta')}
                </Button>
              }
            />
          ) : (
            visiblePosts.map((post) => <PostCard key={post.id} post={post} showCommunity />)
          )}
        </div>
      </div>

      {/* right rail */}
      <aside className="hidden w-[340px] shrink-0 space-y-4 xl:block">
        {incoming.length > 0 && (
          <Card className="p-4">
            <SectionHeader title={t('profile.friendRequests')} icon={<UserPlus className="h-4 w-4 text-sky" />} />
            <div className="space-y-3">
              {incoming.map((user) => (
                user && (
                  <div key={user.id} className="flex items-center gap-3">
                    <UserAvatar user={user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/profile/${user.username}`} className="block truncate text-sm font-semibold hover:underline">
                        {user.displayName}
                      </Link>
                      <p className="truncate text-xs text-cloud-500">{user.identityTags[0]}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => acceptFriend(user.id)} aria-label={t('profile.friendAccept')} className="rounded-full bg-sky p-1.5 text-navy-900 hover:bg-sky-400">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => declineFriend(user.id)} aria-label={t('profile.friendDecline')} className="rounded-full bg-cloud-200 p-1.5 text-cloud-600 hover:bg-cloud-300 dark:bg-navy-700 dark:text-cloud-300">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <SectionHeader title={t('explore.recommendedUsers')} icon={<Users className="h-4 w-4 text-sky" />} />
          <div className="space-y-3.5">
            {suggested.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <UserAvatar user={user} size="sm" />
                <Link to={`/profile/${user.username}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold hover:underline">{user.displayName}</p>
                  <p className="truncate text-xs text-cloud-500">
                    {user.identityTags[0]} · {user.countryCode}
                  </p>
                </Link>
                <Button size="sm" variant={isFollowing(user.id) ? 'outline' : 'primary'} onClick={() => toggleFollow(user.id)}>
                  {isFollowing(user.id) ? t('common.following') : t('common.follow')}
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader title={t('explore.popularHashtags')} icon={<TrendingUp className="h-4 w-4 text-sky" />} />
          <div className="space-y-2.5">
            {trendingHashtags.slice(0, 6).map((h, i) => (
              <Link key={h.tag} to={`/search?q=%23${h.tag}`} className="flex items-center gap-3 text-sm hover:opacity-80">
                <span className="font-display font-bold text-cloud-300 dark:text-navy-600">{i + 1}</span>
                <span className="flex-1 font-medium text-navy-700 dark:text-cloud-200">#{h.tag}</span>
                <span className="text-xs text-cloud-500">{formatCount(h.posts, lang)}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <SectionHeader title={t('activities.seasonal')} icon={<Sparkles className="h-4 w-4 text-sky" />} />
          <div className="space-y-3">
            {seasonalChallenges.slice(0, 2).map((sc) => {
              const current = sc.metric === 'xp' ? state.progress.xpEarned : state.progress[sc.metric]
              const pct = Math.min(100, Math.round((current / sc.target) * 100))
              return (
                <div key={sc.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{sc.title}</span>
                    <span className="text-xs text-cloud-500">{formatCount(Math.min(current, sc.target), lang)} / {formatCount(sc.target, lang)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cloud-200 dark:bg-navy-700">
                    <div className="h-full rounded-full bg-sky transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <Link to="/activities" className="mt-3 block text-sm font-medium text-sky-600 hover:underline dark:text-sky">
            {t('common.viewAll')} →
          </Link>
        </Card>

        <Card className="p-4">
          <SectionHeader title={t('explore.trendingTopics')} />
          <div className="flex flex-wrap gap-2">
            {trendingTopics.slice(0, 4).map((topic) => (
              <Link key={topic.title} to={`/search?q=${encodeURIComponent(topic.title)}`}>
                <Badge tone={topic.hot ? 'sky' : 'default'}>
                  {topic.hot && '🔥'} {topic.title}
                </Badge>
              </Link>
            ))}
          </div>
        </Card>

        <footer className="px-1 pb-6 text-center text-[11px] leading-relaxed text-cloud-400">
          <p className="font-display font-semibold text-cloud-500 dark:text-cloud-400">WingLink · {t('footer.tagline')}</p>
          <p className="mt-1">{t('footer.free')} · {t('footer.noAds')} · {t('footer.safety')}</p>
        </footer>
      </aside>
    </div>
  )
}
