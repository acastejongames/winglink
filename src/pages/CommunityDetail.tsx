import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Flag, Lock, Shield, Trophy, Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { PostCard } from '@/components/feed/PostCard'
import { PostComposer } from '@/components/feed/PostComposer'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge, Button, Card, EmptyState, Spinner, Tabs } from '@/components/ui/Primitives'
import { SectionHeader } from '@/components/RichText'
import { ReportModal } from '@/components/modals'
import { formatCount, timeAgo } from '@/lib/utils'

export default function CommunityDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t, lang } = useI18n()
  const { state, me, toggleJoinCommunity, joinChallenge, getUser } = useStore()
  const [tab, setTab] = useState('feed')
  const [reportOpen, setReportOpen] = useState(false)

  const community = state.communities.find((c) => c.slug === slug)

  const posts = useMemo(
    () => state.posts.filter((p) => p.communityId === community?.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [state.posts, community?.id],
  )

  if (!community) return <Spinner />

  const admins = community.adminIds.map((id) => getUser(id)).filter(Boolean)
  const mods = community.modIds.map((id) => getUser(id)).filter(Boolean)
  const members = community.memberIds.map((id) => getUser(id)).filter(Boolean)
  const canSeeFeed = community.visibility === 'public' || community.joined

  const ranking = useMemo(() => {
    const rows = community.memberIds
      .map((id) => ({ id, user: getUser(id) }))
      .filter((r) => r.user)
      .map((r) => ({
        ...r,
        points:
          (r.user!.stats.posts * 10) +
          (r.user!.stats.comments * 4) +
          (r.user!.stats.quizzesPlayed * 6) +
          Math.floor(r.user!.xp / 20),
      }))
      .sort((a, b) => b.points - a.points)
    return rows
  }, [community.memberIds, getUser])

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/communities" className="inline-flex items-center gap-1.5 text-sm text-cloud-500 hover:text-sky">
        <ArrowLeft className="h-4 w-4" /> {t('communities.title')}
      </Link>

      {/* banner */}
      <Card className="overflow-hidden">
        <div className="relative h-40 sm:h-52">
          <img src={community.banner} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/75 to-transparent" />
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-10 flex flex-wrap items-end gap-4">
            <img
              src={community.avatar}
              alt=""
              className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-card dark:border-navy-800"
            />
            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold">{community.name}</h1>
                {community.visibility === 'private' && (
                  <Badge tone="amber">
                    <Lock className="h-3 w-3" /> {t('common.private')}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-cloud-500">
                {t('communities.members', { n: formatCount(community.memberCount, lang) })} · {community.category} · {t('profile.joined', { date: timeAgo(community.createdAt, lang) })}
              </p>
            </div>
            <div className="flex gap-2 pb-1">
              <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
                <Flag className="h-4 w-4" /> {t('common.report')}
              </Button>
              <Button variant={community.joined ? 'outline' : 'primary'} onClick={() => toggleJoinCommunity(community.id)}>
                {community.joined ? t('common.leave') : community.pending ? t('common.requested') : t('common.join')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'feed', label: t('communities.feed') },
          { id: 'about', label: t('communities.about') },
          { id: 'members', label: t('communities.membersTab'), count: community.memberCount },
          { id: 'challenges', label: t('communities.challenges'), count: community.challenges.length },
          { id: 'rankings', label: t('communities.rankings') },
        ]}
      />

      {tab === 'feed' &&
        (!canSeeFeed ? (
          <EmptyState
            icon={<Lock className="h-8 w-8" />}
            title={t('profile.privateTitle')}
            body={t('communities.privateHint')}
            action={<Button onClick={() => toggleJoinCommunity(community.id)}>{community.pending ? t('common.requested') : t('common.join')}</Button>}
          />
        ) : (
          <div className="space-y-4">
            {community.joined && <PostComposer communityId={community.id} />}
            {posts.length === 0 ? (
              <EmptyState title={t('communities.emptyFeed')} />
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </div>
        ))}

      {tab === 'about' && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Card className="p-5 sm:col-span-2">
            <SectionHeader title={t('communities.about')} />
            <p className="text-sm leading-relaxed text-navy-700 dark:text-cloud-200">{community.description}</p>
          </Card>
          <Card className="p-5">
            <SectionHeader title={t('communities.rules')} icon={<Shield className="h-4 w-4 text-sky" />} />
            <ol className="space-y-2.5">
              {community.rules.map((rule, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky/15 text-[11px] font-bold text-sky-600 dark:text-sky">
                    {i + 1}
                  </span>
                  <span className="text-navy-700 dark:text-cloud-200">{rule}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="p-5">
            <SectionHeader title={t('communities.admins')} icon={<Users className="h-4 w-4 text-sky" />} />
            <div className="space-y-3">
              {[...admins.map((u) => ({ u, role: t('communities.admins') })), ...mods.map((u) => ({ u, role: t('communities.mods') }))].map(
                ({ u, role }) =>
                  u && (
                    <Link key={u.id} to={`/profile/${u.username}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-cloud-100 dark:hover:bg-navy-700">
                      <UserAvatar user={u} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{u.displayName}</span>
                        <span className="block truncate text-xs text-cloud-500">{role} · @{u.username}</span>
                      </span>
                    </Link>
                  ),
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === 'members' && (
        <Card className="p-5">
          <SectionHeader title={t('communities.membersTab')} icon={<Users className="h-4 w-4 text-sky" />} />
          <div className="grid gap-3 sm:grid-cols-2">
            {members.length === 0 && <p className="text-sm text-cloud-500">{t('common.empty')}</p>}
            {members.map(
              (u) =>
                u && (
                  <Link key={u.id} to={`/profile/${u.username}`} className="flex items-center gap-3 rounded-xl border border-cloud-200 p-3 hover:border-sky dark:border-navy-600">
                    <UserAvatar user={u} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{u.displayName}</span>
                      <span className="block truncate text-xs text-cloud-500">@{u.username} · {u.countryCode}</span>
                    </span>
                    {community.adminIds.includes(u.id) && <Badge tone="sky">Admin</Badge>}
                  </Link>
                ),
            )}
          </div>
          {community.memberCount > members.length && (
            <p className="mt-3 text-center text-xs text-cloud-500">
              +{formatCount(community.memberCount - members.length, lang)} {t('communities.membersTab').toLowerCase()}
            </p>
          )}
        </Card>
      )}

      {tab === 'challenges' && (
        <div className="space-y-4">
          {community.challenges.length === 0 ? (
            <EmptyState icon={<Trophy className="h-8 w-8" />} title={t('common.empty')} />
          ) : (
            community.challenges.map((ch) => {
              const joined = false
              return (
                <Card key={ch.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-2 font-display font-semibold">
                        <Trophy className="h-4 w-4 text-amber-400" /> {ch.title}
                      </h3>
                      <p className="mt-1 text-sm text-cloud-500">{ch.description}</p>
                      <p className="mt-2 text-xs text-cloud-400">
                        {t('post.pollEnds', { when: timeAgo(ch.endsAt, lang) })} · {formatCount(ch.participants, lang)} participants
                      </p>
                    </div>
                    <Button size="sm" onClick={() => joinChallenge(community.id, ch.id)}>
                      {t('communities.challengeJoin')}
                    </Button>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}

      {tab === 'rankings' && (
        <Card className="p-5">
          <SectionHeader title={t('communities.rankings')} icon={<Trophy className="h-4 w-4 text-sky" />} />
          <ol className="space-y-1.5">
            {ranking.map((row, i) => (
              <li key={row.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i < 3 ? 'bg-cloud-100 dark:bg-navy-900/60' : ''}`}>
                <span className={`w-7 text-center font-display font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-cloud-400' : i === 2 ? 'text-amber-600/70' : 'text-cloud-400'}`}>
                  {i + 1}
                </span>
                <UserAvatar user={row.user} size="xs" />
                <Link to={`/profile/${row.user!.username}`} className="flex-1 truncate text-sm font-medium hover:underline">
                  {row.user!.displayName}
                </Link>
                <span className="text-sm font-bold text-sky-600 dark:text-sky">{formatCount(row.points, lang)} pts</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="community" targetId={community.id} />
    </div>
  )
}
