import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Compass, Hash, Plane, Search, User as UserIcon, Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { PostCard } from '@/components/feed/PostCard'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge, Button, Card, EmptyState, Tabs } from '@/components/ui/Primitives'
import { SectionHeader } from '@/components/RichText'
import { aircraft } from '@/lib/content/aircraft'
import { topHashtags } from '@/lib/content/trending'
import { formatCount } from '@/lib/utils'
import { useState } from 'react'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const { t, lang } = useI18n()
  const { state, me, isFollowing, toggleFollow, toggleJoinCommunity } = useStore()
  const [tab, setTab] = useState('top')

  const query = q.toLowerCase().replace(/^#/, '')

  const results = useMemo(() => {
    if (!query) return null
    const users = state.users.filter(
      (u) =>
        u.id !== me?.id &&
        !state.blocked.includes(u.id) &&
        (u.displayName.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          u.identityTags.join(' ').toLowerCase().includes(query) ||
          u.country.toLowerCase().includes(query)),
    )
    const posts = state.posts.filter(
      (p) =>
        !state.blocked.includes(p.authorId) &&
        (p.text.toLowerCase().includes(query) || p.hashtags.some((h) => h.includes(query))),
    )
    const communities = state.communities.filter(
      (c) => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query),
    )
    const hashtags = topHashtags(state.posts, 24).filter((h) => h.tag.toLowerCase().includes(query))
    const planes = aircraft.filter(
      (a) => a.name.toLowerCase().includes(query) || a.manufacturer.toLowerCase().includes(query),
    )
    return { users, posts, communities, hashtags, planes }
  }, [query, state.users, state.posts, state.communities, state.blocked, me?.id])

  if (!q) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyState icon={<Search className="h-8 w-8" />} title={t('search.empty')} action={<Link to="/explore"><Button variant="outline">{t('explore.title')}</Button></Link>} />
      </div>
    )
  }

  if (!results || results.users.length + results.posts.length + results.communities.length + results.hashtags.length + results.planes.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyState icon={<Search className="h-8 w-8" />} title={t('explore.noResults', { q })} action={<Link to="/explore"><Button variant="outline">{t('explore.title')}</Button></Link>} />
      </div>
    )
  }

  const show = {
    top: true,
    users: tab === 'users',
    posts: tab === 'posts',
    communities: tab === 'communities',
    hashtags: tab === 'hashtags',
    aircraft: tab === 'aircraft',
  }

  const visible =
    tab === 'top'
      ? results
      : {
          users: show.users ? results.users : [],
          posts: show.posts ? results.posts : [],
          communities: show.communities ? results.communities : [],
          hashtags: show.hashtags ? results.hashtags : [],
          planes: show.aircraft ? results.planes : [],
        }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">{t('search.title')}</h1>
        <p className="mt-1 text-sm text-cloud-500">{t('explore.resultsFor', { q })}</p>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        size="sm"
        tabs={[
          { id: 'top', label: t('search.top') },
          { id: 'users', label: t('explore.filters.users'), count: results.users.length },
          { id: 'posts', label: t('explore.filters.posts'), count: results.posts.length },
          { id: 'communities', label: t('explore.filters.communities'), count: results.communities.length },
          { id: 'hashtags', label: t('explore.filters.hashtags'), count: results.hashtags.length },
          { id: 'aircraft', label: t('explore.filters.aircraft'), count: results.planes.length },
        ]}
      />

      {visible.users.length > 0 && (
        <Card className="p-4">
          <SectionHeader title={t('explore.filters.users')} icon={<Users className="h-4 w-4 text-sky" />} />
          <div className="space-y-3">
            {visible.users.map((user) => (
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

      {visible.posts.length > 0 && (
        <div className="space-y-4">
          <SectionHeader title={t('explore.filters.posts')} />
          {visible.posts.slice(0, tab === 'top' ? 3 : 20).map((p) => (
            <PostCard key={p.id} post={p} showCommunity />
          ))}
        </div>
      )}

      {visible.communities.length > 0 && (
        <Card className="p-4">
          <SectionHeader title={t('explore.filters.communities')} icon={<Compass className="h-4 w-4 text-sky" />} />
          <div className="space-y-3">
            {visible.communities.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <img src={c.avatar} alt="" className="h-11 w-11 rounded-xl object-cover" loading="lazy" />
                <Link to={`/communities/${c.slug}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold hover:underline">{c.name}</p>
                  <p className="text-xs text-cloud-500">{t('communities.members', { n: formatCount(c.memberCount, lang) })}</p>
                </Link>
                <Button size="sm" onClick={() => toggleJoinCommunity(c.id)}>{c.joined ? t('common.joined') : t('common.join')}</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {visible.hashtags.length > 0 && (
        <Card className="p-4">
          <SectionHeader title={t('explore.filters.hashtags')} icon={<Hash className="h-4 w-4 text-sky" />} />
          <div className="flex flex-wrap gap-2">
            {visible.hashtags.map((h) => (
              <Link key={h.tag} to={`/search?q=%23${h.tag}`}>
                <Badge tone="sky">#{h.tag} · {formatCount(h.posts, lang)}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {visible.planes.length > 0 && (
        <Card className="p-4">
          <SectionHeader title={t('explore.filters.aircraft')} icon={<Plane className="h-4 w-4 text-sky" />} />
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.planes.map((a) => (
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
}
