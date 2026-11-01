import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Award, Bell, Check, Heart, AtSign, MessageCircle, Settings, Trophy, UserPlus, Users, UsersRound, Megaphone,
} from 'lucide-react'
import type { NotificationCategory } from '@/lib/types'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge, Button, Card, EmptyState, Tabs } from '@/components/ui/Primitives'
import { SectionHeader } from '@/components/RichText'
import { cn, timeAgo } from '@/lib/utils'

const CATEGORY_ICONS: Record<NotificationCategory, React.ReactNode> = {
  followers: <UserPlus className="h-4 w-4" />,
  friends: <Users className="h-4 w-4" />,
  reactions: <Heart className="h-4 w-4" />,
  comments: <MessageCircle className="h-4 w-4" />,
  mentions: <AtSign className="h-4 w-4" />,
  communities: <UsersRound className="h-4 w-4" />,
  messages: <Bell className="h-4 w-4" />,
  challenges: <Trophy className="h-4 w-4" />,
  achievements: <Award className="h-4 w-4" />,
}

const TABS: { id: string; category?: NotificationCategory }[] = [
  { id: 'all' },
  { id: 'followers', category: 'followers' },
  { id: 'friends', category: 'friends' },
  { id: 'reactions', category: 'reactions' },
  { id: 'comments', category: 'comments' },
  { id: 'mentions', category: 'mentions' },
  { id: 'communities', category: 'communities' },
  { id: 'achievements', category: 'achievements' },
]

export default function Notifications() {
  const { t, lang } = useI18n()
  const { state, markNotificationRead, markAllNotificationsRead } = useStore()
  const [tab, setTab] = useState('all')

  const list = useMemo(() => {
    const current = TABS.find((x) => x.id === tab)
    const items = current?.category ? state.notifications.filter((n) => n.category === current.category) : state.notifications
    return [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [tab, state.notifications])

  const unread = state.notifications.filter((n) => !n.read).length

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('notifications.title')}</h1>
          {unread > 0 && <p className="mt-1 text-sm text-cloud-500">{unread} {t('messages.unread').toLowerCase()}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllNotificationsRead} disabled={unread === 0}>
            <Check className="h-4 w-4" /> {t('notifications.markAll')}
          </Button>
          <Link to="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" /> {t('notifications.preferences')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <Tabs active={tab} onChange={setTab} size="sm" tabs={TABS.map((x) => ({ id: x.id, label: x.id === 'all' ? t('notifications.all') : t(`notifications.${x.id}`) }))} />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Bell className="h-8 w-8" />} title={t('notifications.empty')} />
      ) : (
        <Card className="divide-y divide-cloud-100 overflow-hidden dark:divide-navy-700/60">
          {list.map((n) => {
            const actor = n.actorId ? state.users.find((u) => u.id === n.actorId) : undefined
            const content = (
              <div
                onClick={() => markNotificationRead(n.id)}
                className={cn(
                  'flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-cloud-50 dark:hover:bg-navy-700/40',
                  !n.read && 'bg-sky/5',
                )}
              >
                <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', n.category === 'achievements' ? 'bg-amber-500/15 text-amber-500' : 'bg-sky/15 text-sky-600 dark:text-sky')}>
                  {CATEGORY_ICONS[n.category]}
                </span>
                {actor ? <UserAvatar user={actor} size="sm" className="mt-0.5" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-navy-700 dark:text-cloud-200">
                    {actor && <strong className="font-semibold text-navy-800 dark:text-cloud-50">{actor.displayName} </strong>}
                    {n.text}
                  </p>
                  <p className="mt-0.5 text-xs text-cloud-500">{timeAgo(n.createdAt, lang)}</p>
                </div>
                {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-sky" />}
              </div>
            )
            return n.link ? (
              <Link key={n.id} to={n.link} className="block">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
