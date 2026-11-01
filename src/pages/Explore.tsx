import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass, Hash, Images, Plane, Search as SearchIcon, TrendingUp, User as UserIcon, Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { PostCard } from '@/components/feed/PostCard'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge, Button, Card, EmptyState, Input, Tabs } from '@/components/ui/Primitives'
import { SectionHeader } from '@/components/RichText'
import { topHashtags } from '@/lib/content/trending'
import { aircraft } from '@/lib/content/aircraft'
import { categoryLabels } from '@/lib/content/aircraft'
import { formatCount } from '@/lib/utils'

type Filter = 'all' | 'users' | 'posts' | 'communities' | 'hashtags' | 'aircraft'

export default function Explore() {
  const { t, lang } = useI18n()
  const { state, me, isFollowing, toggleFollow, toggleJoinCommunity } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')

  const query = q.trim().toLowerCase().replace(/^#/, '')

  const results = useMemo(() => {
    if (!query) return null
    const users = state.users.filter(
      (u) =>
        u.id !== me?.id &&
        !state.blocked.includes(u.id) &&
        (u.displayName.toLowerCase().includes(query) || u.username.toLowerCase().includes(query) || u.identityTags.join(' ').toLowerCase().includes(query)),
    )
    const posts = state.posts.filter(
      (p) =>
        !state.blocked.includes(p.authorId) &&
        (p.text.toLowerCase().includes(query) || p.hashtags.some((h) => h.includes(query))),
    )
    const communities = state.communities.filter(
      (c) => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query) || c.category.toLowerCase().includes(query),
    )
    const hashtags = topHashtags(state.posts, 24).filter((h) => h.tag.toLowerCase().includes(query))
    const aircraftResults = aircraft.filter(
      (a) => a.name.toLowerCase().includes(query) || a.manufacturer.toLowerCase().includes(query) || a.country.toLowerCase().includes(query),
    )
    return { users, posts, communities, hashtags, aircraft: aircraftResults }
  }, [query, state.users, state.posts, state.communities, state.blocked, me?.id])

  const filtered = useMemo(() => {
    if (!results) return null
    switch (filter) {
      case 'users':
        return { ...results, posts: [], communities: [], hashtags: [], aircraft: [] }
      case 'posts':
        return { ...results, users: [], communities: [], hashtags: [], aircraft: [] }
      case 'communities':
        return { ...results, users: [], posts: [], hashtags: [], aircraft: [] }
      case 'hashtags':
        return { ...results, users: [], posts: [], communities: [], aircraft: [] }
      case 'aircraft':
        return { ...results, users: [], posts: [], communities: [], hashtags: [] }
      default:
        return results
    }
  }, [results, filter])

  const trendingPosts = useMemo(
    () => [...state.posts].filter((p) => !state.blocked.includes(p.authorId)).sort((a, b) => b.likes - a.likes).slice(0, 3),
    [state.posts, state.blocked],
  )
  const photoPosts = useMemo(
    () => state.posts.filter((p) => p.images?.length && !state.blocked.includes(p.authorId)).slice(0, 8),
    [state.posts, state.blocked],
  )
  const recommendedUsers = state.users.filter((u) => u.id !== me?.id && !isFollowing(u.id) && !state.blocked.includes(u.id)).slice(0, 4)
  const recommendedCommunities = state.communities.filter((c) => !c.joined).slice(0, 4)
  const recentlyActive = state.communities.filter((c) => c.joined || c.memberCount > 20000).slice(0, 5)
  const topTags = topHashtags(state.posts, 12)
  const hasResults = filtered && (filtered.users.length + filtered.posts.length + filtered.communities.length + filtered.hashtags.length + filtered.aircraft.length) > 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t('explore.title')}</h1>
        <p className="mt-1 text-sm text-cloud-500">{t('auth.subtitle')}</p>
      </div>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('explore.searchPlaceholder')}
        className="h-12 pl-10"
        aria-label={t('common.search')}
      />

      <div className="flex flex-wrap gap-2">
        {(['all', 'users', 'posts', 'communities', 'hashtags', 'aircraft'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-navy-800 text-sky dark:bg-navy-700' : 'bg-white text-cloud-600 hover:bg-cloud-200 dark:bg-navy-800 dark:text-cloud-300 dark:hover:bg-navy-700'
            }`}
          >
            {f === 'all' ? t('common.all') : t(`explore.filters.${f}`)}
          </button>
        ))}
      </div>

      {filtered ? (
        !hasResults ? (
          <EmptyState icon={<SearchIcon className="h-8 w-8" />} title={t('explore.noResults', { q })} />
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-cloud-500">{t('explore.resultsFor', { q })}</p>
            {filtered.users.length > 0 && (
              <Card className="p-4">
                <SectionHeader title={t('explore.filters.users')} icon={<Users className="h-4 w-4 text-sky" />} />
                <div className="space-y-3">
                  {filtered.users.map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <UserAvatar user={user} size="sm" />
                      <Link to={`/profile/${user.username}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold hover:underline">{user.displayName}</p>
                        <p className="truncate text-xs text-cloud-500">@{user.username} · {user.country}</p>
                      </Link>
                      <Button size="sm" variant={isFollowing(user.id) ? 'outline' : 'primary'} onClick={() => toggleFollow(user.id)}>
                        {isFollowing(user.id) ? t('common.following') : t('common.follow')}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {filtered.posts.length > 0 && (
              <div className="space-y-4">
                <SectionHeader title={t('explore.filters.posts')} />
                {filtered.posts.map((p) => (
                  <PostCard key={p.id} post={p} showCommunity />
                ))}
              </div>
            )}
            {filtered.communities.length > 0 && (
              <Card className="p-4">
                <SectionHeader title={t('explore.filters.communities')} icon={<Compass className="h-4 w-4 text-sky" />} />
                <div className="grid gap-3 sm:grid-cols-2">
                  {filtered.communities.map((c) => (
                    <Link key={c.id} to={`/communities/${c.slug}`} className="flex items-center gap-3 rounded-xl border border-cloud-200 p-3 hover:border-sky dark:border-navy-600">
                      <img src={c.avatar} alt="" className="h-12 w-12 rounded-xl object-cover" loading="lazy" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="text-xs text-cloud-500">{t('communities.members', { n: formatCount(c.memberCount, lang) })}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
            {filtered.hashtags.length > 0 && (
              <Card className="p-4">
                <SectionHeader title={t('explore.filters.hashtags')} icon={<Hash className="h-4 w-4 text-sky" />} />
                <div className="flex flex-wrap gap-2">
                  {filtered.hashtags.map((h) => (
                    <Link key={h.tag} to={`/search?q=%23${h.tag}`}>
                      <Badge tone="sky">#{h.tag} · {formatCount(h.posts, lang)}</Badge>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
            {filtered.aircraft.length > 0 && (
              <Card className="p-4">
                <SectionHeader title={t('explore.filters.aircraft')} icon={<Plane className="h-4 w-4 text-sky" />} />
                <div className="grid gap-3 sm:grid-cols-2">
                  {filtered.aircraft.map((a) => (
                    <Link key={a.id} to={`/aircraft/${a.id}`} className="flex items-center gap-3 rounded-xl border border-cloud-200 p-3 hover:border-sky dark:border-navy-600">
                      <img src={a.image} alt="" className="h-12 w-16 rounded-lg object-cover" loading="lazy" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{a.name}</p>
                        <p className="truncate text-xs text-cloud-500">{a.manufacturer}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )
      ) : (
        <div className="space-y-8">
          {/* trending posts */}
          <section>
            <SectionHeader title={t('explore.trendingPosts')} icon={<TrendingUp className="h-4 w-4 text-sky" />} />
            {trendingPosts.length === 0 ? (
              <EmptyState icon={<TrendingUp className="h-8 w-8" />} title={t('explore.beFirst')} />
            ) : (
              <div className="space-y-4">
                {trendingPosts.map((p) => (
                  <PostCard key={p.id} post={p} showCommunity />
                ))}
              </div>
            )}
          </section>

          {/* popular photographs */}
          {photoPosts.length > 0 && (
          <section>
            <SectionHeader title={t('explore.popularPhotos')} icon={<Images className="h-4 w-4 text-sky" />} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {photoPosts.map((p) => (
                <Link key={p.id} to={`/profile/${state.users.find((u) => u.id === p.authorId)?.username}`} className="group relative aspect-[4/3] overflow-hidden rounded-xl">
                  <img src={p.images![0]} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 to-transparent p-2 pt-6 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {state.users.find((u) => u.id === p.authorId)?.displayName}
                  </span>
                </Link>
              ))}
            </div>
          </section>
          )}

          {(recommendedUsers.length > 0 || recommendedCommunities.length > 0) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* recommended users */}
            <Card className="p-4">
              <SectionHeader title={t('explore.recommendedUsers')} icon={<UserIcon className="h-4 w-4 text-sky" />} />
              <div className="space-y-4">
                {recommendedUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <UserAvatar user={user} size="md" />
                    <Link to={`/profile/${user.username}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold hover:underline">{user.displayName}</p>
                      <p className="truncate text-xs text-cloud-500">{user.identityTags.join(' · ')} · {user.countryCode}</p>
                    </Link>
                    <Button size="sm" onClick={() => toggleFollow(user.id)}>{t('common.follow')}</Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* recommended communities */}
            <Card className="p-4">
              <SectionHeader title={t('explore.recommendedCommunities')} icon={<Compass className="h-4 w-4 text-sky" />} />
              <div className="space-y-4">
                {recommendedCommunities.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <img src={c.avatar} alt="" className="h-12 w-12 rounded-xl object-cover" loading="lazy" />
                    <Link to={`/communities/${c.slug}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold hover:underline">{c.name}</p>
                      <p className="truncate text-xs text-cloud-500">{t('communities.members', { n: formatCount(c.memberCount, lang) })} · {c.category}</p>
                    </Link>
                    <Button size="sm" onClick={() => toggleJoinCommunity(c.id)}>{t('common.join')}</Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          )}

          {/* popular hashtags */}
          {topTags.length > 0 && (
          <Card className="p-4">
            <SectionHeader title={t('explore.popularHashtags')} icon={<Hash className="h-4 w-4 text-sky" />} />
            <div className="grid grid-cols-2 gap-2">
              {topTags.map((h) => (
                <Link key={h.tag} to={`/search?q=%23${h.tag}`} className="flex items-center justify-between rounded-xl bg-cloud-100 px-3 py-2.5 text-sm hover:bg-sky/10 dark:bg-navy-900/60">
                  <span className="font-medium">#{h.tag}</span>
                  <span className="text-xs text-cloud-500">{formatCount(h.posts, lang)}</span>
                </Link>
              ))}
            </div>
          </Card>
          )}

          {/* recently active communities */}
          {recentlyActive.length > 0 && (
          <Card className="p-4">
            <SectionHeader title={t('explore.recentCommunities')} />
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {recentlyActive.map((c) => (
                <Link key={c.id} to={`/communities/${c.slug}`} className="group w-44 shrink-0 overflow-hidden rounded-xl border border-cloud-200 dark:border-navy-600">
                  <div className="relative h-20">
                    <img src={c.banner} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    <img src={c.avatar} alt="" className="absolute -bottom-4 left-3 h-10 w-10 rounded-lg border-2 border-white object-cover dark:border-navy-800" />
                  </div>
                  <div className="px-3 pb-3 pt-5">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-cloud-500">{t('communities.members', { n: formatCount(c.memberCount, lang) })}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
          )}
        </div>
      )}
    </div>
  )
}
