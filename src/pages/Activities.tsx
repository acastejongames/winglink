import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Award, Clock, Compass, Flag, Globe2, History, Gauge, MapPin, Plane, Trophy, Zap,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { Badge, Button, Card, Tabs } from '@/components/ui/Primitives'
import { SectionHeader } from '@/components/RichText'
import { seasonalChallenges, demoLeaderboards } from '@/lib/demo/quiz'
import { BADGE_DEFS, RANKS, RANK_NAMES, rankForLevel } from '@/lib/gamification'
import { UserAvatar } from '@/components/UserAvatar'
import { cn, formatCount, levelFromXp, timeAgo } from '@/lib/utils'
import { useState } from 'react'
import type { QuizMode } from '@/lib/types'

const ACTIVITIES: { mode: QuizMode; icon: typeof Plane; tone: string }[] = [
  { mode: 'aircraft', icon: Plane, tone: 'from-sky/25 to-sky/5 text-sky' },
  { mode: 'manufacturer', icon: Flag, tone: 'from-indigo-500/25 to-indigo-500/5 text-indigo-400' },
  { mode: 'cockpit', icon: Gauge, tone: 'from-emerald-500/25 to-emerald-500/5 text-emerald-400' },
  { mode: 'silhouette', icon: Compass, tone: 'from-violet-500/25 to-violet-500/5 text-violet-400' },
  { mode: 'country', icon: MapPin, tone: 'from-amber-500/25 to-amber-500/5 text-amber-400' },
  { mode: 'trivia', icon: Zap, tone: 'from-rose-500/25 to-rose-500/5 text-rose-400' },
  { mode: 'history', icon: History, tone: 'from-cyan-500/25 to-cyan-500/5 text-cyan-400' },
  { mode: 'comparison', icon: Gauge, tone: 'from-lime-500/25 to-lime-500/5 text-lime-400' },
]

export default function Activities() {
  const { t, lang } = useI18n()
  const { state, me, claimChallenge } = useStore()
  const [boardTab, setBoardTab] = useState<'weekly' | 'monthly' | 'global'>('weekly')

  const level = me ? levelFromXp(me.xp) : 1
  const rank = rankForLevel(level)

  const leaderboard = useMemo(() => {
    const rows = demoLeaderboards[boardTab].filter((r) => r.userId !== me?.id).map((r) => ({ ...r, isMe: false }))
    if (me) {
      const myScore =
        boardTab === 'global'
          ? me.xp
          : state.quizRecords.reduce((a, r) => a + r.xp, 0)
      rows.push({ userId: me.id, score: myScore, isMe: true })
    }
    return rows.sort((a, b) => b.score - a.score).slice(0, 10)
  }, [boardTab, me, state.quizRecords])

  const challengeMetric: Record<string, number> = {
    posts: state.progress.posts,
    quizzes: state.progress.quizzes,
    comments: state.progress.comments,
    xp: state.progress.xpEarned,
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">{t('activities.title')}</h1>
        <p className="mt-1 text-sm text-cloud-500">{t('activities.subtitle')}</p>
      </div>

      {/* flagship */}
      <Link to="/activities/aircraft">
        <Card hover className="group overflow-hidden">
          <div className="grid md:grid-cols-[1.2fr_1fr]">
            <div className="relative min-h-[200px]">
              <img src="images/f35.jpg" alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-navy-950/40" />
              <Badge tone="sky" className="absolute left-4 top-4 backdrop-blur">
                <Trophy className="h-3 w-3" /> {t('activities.playNow')}
              </Badge>
            </div>
            <div className="flex flex-col justify-center gap-3 p-6">
              <h2 className="font-display text-2xl font-bold">{t('activities.guessAircraft')}</h2>
              <p className="text-sm leading-relaxed text-cloud-500 dark:text-cloud-400">{t('activities.guessAircraftDesc')}</p>
              <div className="flex flex-wrap gap-2">
                <Badge tone="sky">{t('quiz.easy')}</Badge>
                <Badge>{t('quiz.medium')}</Badge>
                <Badge>{t('quiz.hard')}</Badge>
              </div>
              <Button className="mt-2 w-fit">
                <Plane className="h-4 w-4" /> {t('activities.playNow')}
              </Button>
            </div>
          </div>
        </Card>
      </Link>

      {/* activity grid */}
      <section>
        <SectionHeader title={t('activities.title')} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIVITIES.filter((a) => a.mode !== 'aircraft').map((a) => (
            <Link key={a.mode} to={`/activities/${a.mode}`}>
              <Card hover className="h-full p-4">
                <span className={cn('inline-flex rounded-xl bg-gradient-to-br p-2.5', a.tone)}>
                  <a.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-semibold">{t(`activities.${a.mode === 'aircraft' ? 'guessAircraft' : a.mode}`)}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-cloud-500">{t(`activities.${a.mode === 'aircraft' ? 'guessAircraft' : a.mode}Desc`)}</p>
              </Card>
            </Link>
          ))}
          <Link to="/communities">
            <Card hover className="h-full p-4">
              <span className="inline-flex rounded-xl bg-gradient-to-br from-pink-500/25 to-pink-500/5 p-2.5 text-pink-400">
                <UsersIcon />
              </span>
              <h3 className="mt-3 text-sm font-semibold">{t('activities.communityChallenges')}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-cloud-500">{t('activities.communityChallengesDesc')}</p>
            </Card>
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* leaderboards + seasonal */}
        <div className="space-y-6">
          <Card className="p-5">
            <SectionHeader
              title={t('activities.leaderboards')}
              icon={<Trophy className="h-4 w-4 text-sky" />}
              action={
                <Tabs
                  size="sm"
                  active={boardTab}
                  onChange={(id) => setBoardTab(id as typeof boardTab)}
                  tabs={[
                    { id: 'weekly', label: t('activities.leaderboardWeekly') },
                    { id: 'monthly', label: t('activities.leaderboardMonthly') },
                    { id: 'global', label: t('activities.leaderboardGlobal') },
                  ]}
                />
              }
            />
            <ol className="mt-2 space-y-1.5">
              {leaderboard.map((row, i) => {
                const user = state.users.find((u) => u.id === row.userId)
                return (
                  <li
                    key={row.userId}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5',
                      row.isMe ? 'bg-sky/10 ring-1 ring-sky/40' : i < 3 ? 'bg-cloud-100 dark:bg-navy-900/60' : '',
                    )}
                  >
                    <span className={cn('w-7 text-center font-display text-lg font-bold', i === 0 ? 'text-amber-400' : i === 1 ? 'text-cloud-400' : i === 2 ? 'text-amber-600/70' : 'text-cloud-400')}>
                      {i + 1}
                    </span>
                    <UserAvatar user={user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {row.isMe ? `${t('activities.you')} · @${me?.username}` : user?.displayName}
                      </p>
                      {!row.isMe && user && (
                        <p className="text-xs text-cloud-500">
                          {RANK_NAMES[rankForLevel(levelFromXp(user.xp)).id][lang]}
                        </p>
                      )}
                    </div>
                    <span className="font-display text-sm font-bold text-sky-600 dark:text-sky">{formatCount(row.score, lang)} XP</span>
                  </li>
                )
              })}
            </ol>
          </Card>

          <Card className="p-5">
            <SectionHeader title={t('activities.seasonal')} icon={<Zap className="h-4 w-4 text-sky" />} />
            <div className="space-y-4">
              {seasonalChallenges.map((sc) => {
                const current = challengeMetric[sc.metric] ?? 0
                const done = current >= sc.target
                const claimed = state.claimedChallenges.includes(sc.id)
                const pct = Math.min(100, Math.round((current / sc.target) * 100))
                return (
                  <div key={sc.id} className="rounded-xl border border-cloud-200 p-4 dark:border-navy-600">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{sc.title}</p>
                        <p className="mt-0.5 text-xs text-cloud-500">{sc.description}</p>
                      </div>
                      <Badge tone={done ? 'green' : 'default'}>+{sc.rewardXp} XP</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cloud-200 dark:bg-navy-700">
                        <div className={cn('h-full rounded-full transition-all', done ? 'bg-emerald-400' : 'bg-sky')} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-cloud-500">
                        {formatCount(Math.min(current, sc.target), lang)} / {formatCount(sc.target, lang)}
                      </span>
                      {done && !claimed && (
                        <Button size="sm" onClick={() => claimChallenge(sc.id, sc.rewardXp)}>
                          {t('common.claim')}
                        </Button>
                      )}
                      {claimed && <Badge tone="green">{t('common.done')}</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title={t('quiz.history')} icon={<Clock className="h-4 w-4 text-sky" />} />
            {state.quizRecords.length === 0 ? (
              <p className="py-3 text-sm text-cloud-500">{t('quiz.noHistory')}</p>
            ) : (
              <div className="space-y-2">
                {state.quizRecords.slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl bg-cloud-100 px-3.5 py-2.5 text-sm dark:bg-navy-900/60">
                    <span className="font-medium">{t(`activities.${r.mode === 'aircraft' ? 'guessAircraft' : r.mode}`)}</span>
                    <span className="text-xs text-cloud-500">{t(`quiz.${r.difficulty}`)} · {timeAgo(r.playedAt, lang)}</span>
                    <span className="font-display font-bold">
                      {r.score}/{r.total} <span className="text-sky">+{r.xp} XP</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* right column: records + ranks */}
        <div className="space-y-6">
          <Card className="p-5">
            <SectionHeader title={t('activities.records')} icon={<Award className="h-4 w-4 text-sky" />} />
            {me && (
              <div className="grid grid-cols-2 gap-3">
                <Stat label={t('activities.recordBest')} value={String(me.stats.quizBestScore)} />
                <Stat label={t('activities.recordPlayed')} value={String(me.stats.quizzesPlayed)} />
                <Stat label={t('activities.recordWins')} value={String(me.stats.quizWins)} />
                <Stat label={t('activities.recordStreak')} value={`${me.stats.streak}🔥`} />
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionHeader title={t('activities.ranks')} icon={<Globe2 className="h-4 w-4 text-sky" />} />
            <ol className="space-y-2">
              {RANKS.map((r) => {
                const active = r.id === rank.id
                return (
                  <li
                    key={r.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm',
                      active ? 'bg-sky/10 ring-1 ring-sky/40' : level > r.minLevel ? 'opacity-70' : '',
                    )}
                  >
                    <span className="text-lg">{r.icon}</span>
                    <span className="flex-1 font-medium">{RANK_NAMES[r.id][lang]}</span>
                    <span className="text-xs text-cloud-500">Lv {r.minLevel}</span>
                  </li>
                )
              })}
            </ol>
          </Card>

          <Card className="p-5">
            <SectionHeader title={t('profile.achievements')} />
            <div className="flex flex-wrap gap-2">
              {BADGE_DEFS.slice(0, 8).map((b) => (
                <span
                  key={b.id}
                  title={lang === 'es' ? b.descEs : b.desc}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl text-xl',
                    me?.badges.includes(b.id) ? 'bg-sky/15 ring-1 ring-sky/40' : 'bg-cloud-200 grayscale opacity-40 dark:bg-navy-700',
                  )}
                >
                  {b.icon}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-cloud-100 px-3 py-3 text-center dark:bg-navy-900/60">
      <p className="font-display text-2xl font-bold text-sky-600 dark:text-sky">{value}</p>
      <p className="mt-0.5 text-[11px] text-cloud-500">{label}</p>
    </div>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
