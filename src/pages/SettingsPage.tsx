import { useState } from 'react'
import { AlertTriangle, Bell, Globe2, Lock, Moon, Shield, Sun, Trash2, UserX } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/Toast'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge, Button, Card, EmptyState, Select, Switch } from '@/components/ui/Primitives'
import { SectionHeader } from '@/components/RichText'
import { Logo } from '@/components/Logo'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NOTIFY_KEYS = [
  'followers', 'friends', 'reactions', 'comments', 'mentions', 'communities', 'messages', 'challenges', 'achievements',
] as const

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const { me, theme, setTheme, state, setPref, setPrefValue, unblockUser, resetData, signOut, updateProfile } = useStore()
  const { toast } = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!me) return null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold">{t('settings.title')}</h1>

      {/* account */}
      <Card className="p-5">
        <SectionHeader title={t('settings.account')} />
        <div className="flex items-center gap-4">
          <UserAvatar user={me} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{me.displayName}</p>
            <p className="truncate text-sm text-cloud-500">@{me.username} · {me.email ?? 'local account'}</p>
            {me.isDemo && <Badge tone="demo" className="mt-1">{t('app.demoBadge')}</Badge>}
          </div>
          <Link to={`/profile/${me.username}`}>
            <Button variant="outline" size="sm">{t('nav.profile')}</Button>
          </Link>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-cloud-500">{t('auth.localNote')}</p>
      </Card>

      {/* appearance & language */}
      <Card className="p-5">
        <SectionHeader title={t('settings.appearance')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <ThemeCard
            active={theme === 'dark'}
            onClick={() => setTheme('dark')}
            icon={<Moon className="h-5 w-5" />}
            label={t('settings.themeDark')}
          />
          <ThemeCard
            active={theme === 'light'}
            onClick={() => setTheme('light')}
            icon={<Sun className="h-5 w-5" />}
            label={t('settings.themeLight')}
          />
        </div>
        <div className="mt-5">
          <SectionHeader title={t('settings.language')} icon={<Globe2 className="h-4 w-4 text-sky" />} />
          <div className="grid gap-3 sm:grid-cols-2">
            <ThemeCard active={lang === 'en'} onClick={() => setLang('en')} icon={<span className="text-lg font-bold">EN</span>} label="English" />
            <ThemeCard active={lang === 'es'} onClick={() => setLang('es')} icon={<span className="text-lg font-bold">ES</span>} label="Español" />
          </div>
        </div>
      </Card>

      {/* privacy */}
      <Card className="p-5">
        <SectionHeader title={t('settings.privacy')} icon={<Shield className="h-4 w-4 text-sky" />} />
        <div className="space-y-4">
          <Select
            label={t('settings.profileVisibility')}
            value={me.visibility}
            onChange={(e) => {
              updateProfile({ visibility: e.target.value as 'public' | 'private' })
              toast(t('settings.saved'))
            }}
          >
            <option value="public">{t('settings.profileVisibilityPublic')}</option>
            <option value="private">{t('settings.profileVisibilityPrivate')}</option>
          </Select>
          <Select
            label={t('settings.whoCanSeeFollowers')}
            value={state.prefs.whoCanSeeFollowers}
            onChange={(e) => setPrefValue('whoCanSeeFollowers', e.target.value)}
          >
            <option value="everyone">{t('messages.everyone')}</option>
            <option value="followers">{t('messages.followersOnly')}</option>
            <option value="nobody">{t('messages.nobody')}</option>
          </Select>
          <Select
            label={t('settings.whoCanTag')}
            value={state.prefs.whoCanTag}
            onChange={(e) => setPrefValue('whoCanTag', e.target.value)}
          >
            <option value="everyone">{t('messages.everyone')}</option>
            <option value="followers">{t('messages.followersOnly')}</option>
            <option value="nobody">{t('messages.nobody')}</option>
          </Select>
          <Select
            label={t('settings.messaging')}
            value={state.prefs.whoCanMessage}
            onChange={(e) => setPrefValue('whoCanMessage', e.target.value)}
          >
            <option value="everyone">{t('messages.everyone')}</option>
            <option value="followers">{t('messages.followersOnly')}</option>
            <option value="nobody">{t('messages.nobody')}</option>
          </Select>
          <p className="flex items-start gap-2 rounded-xl bg-sky/10 p-3 text-xs leading-relaxed text-sky-600 dark:text-sky">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('settings.protectedNote')}
          </p>
        </div>

        <div className="mt-6">
          <SectionHeader title={t('settings.blockedUsers')} icon={<UserX className="h-4 w-4 text-sky" />} />
          {state.blocked.length === 0 ? (
            <p className="text-sm text-cloud-500">{t('settings.noBlocked')}</p>
          ) : (
            <div className="space-y-2">
              {state.blocked.map((id) => {
                const u = state.users.find((x) => x.id === id)
                if (!u) return null
                return (
                  <div key={id} className="flex items-center gap-3 rounded-xl border border-cloud-200 px-3 py-2.5 dark:border-navy-600">
                    <UserAvatar user={u} size="sm" />
                    <span className="flex-1 text-sm font-medium">{u.displayName}</span>
                    <Button size="sm" variant="outline" onClick={() => unblockUser(id)}>{t('common.unblock')}</Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-6">
          <SectionHeader title={t('settings.reports')} />
          {state.reports.length === 0 ? (
            <p className="text-sm text-cloud-500">{t('settings.noReports')}</p>
          ) : (
            <div className="space-y-2">
              {state.reports.map((r) => (
                <div key={r.id} className="rounded-xl bg-cloud-100 px-3.5 py-2.5 text-sm dark:bg-navy-900/60">
                  <span className="font-medium">{r.targetType}</span>
                  <span className="text-cloud-500"> · {r.reason}</span>
                  {r.details && <p className="mt-0.5 text-xs text-cloud-500">{r.details}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* notifications */}
      <Card className="p-5">
        <SectionHeader title={t('settings.notifications')} icon={<Bell className="h-4 w-4 text-sky" />} />
        <div className="space-y-1">
          {NOTIFY_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between py-2.5">
              <span className="text-sm">{t(`notifications.pref${key.charAt(0).toUpperCase()}${key.slice(1)}`)}</span>
              <Switch checked={state.prefs.notify[key] ?? true} onChange={(v) => setPref(key, v)} label={key} />
            </div>
          ))}
        </div>
      </Card>

      {/* about */}
      <Card className="p-5">
        <SectionHeader title={t('settings.about')} icon={<Logo compact />} />
        <p className="text-sm leading-relaxed text-navy-700 dark:text-cloud-200">{t('settings.aboutBody')}</p>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('settings.aboutDemo')}
        </p>
        <p className="mt-3 text-xs text-cloud-500">{t('settings.version', { v: '1.0.0' })}</p>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-cloud-200 pt-4 dark:border-navy-700">
          <Button variant="ghost" size="sm" onClick={() => { signOut(); location.assign('/auth') }}>
            {t('nav.signOut')}
          </Button>
          {confirmDelete ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                resetData()
                toast(t('settings.deleted'))
                location.assign('/auth')
              }}
            >
              <Trash2 className="h-4 w-4" /> {t('settings.deleteConfirm')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> {t('settings.deleteAccount')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

function ThemeCard({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors',
        active ? 'border-sky bg-sky/10 text-sky-600 dark:text-sky' : 'border-cloud-200 hover:border-sky/50 dark:border-navy-600',
      )}
    >
      {icon}
      {label}
      {active && <span className="ml-auto h-2.5 w-2.5 rounded-full bg-sky" />}
    </button>
  )
}
