import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Bell, Compass, Home, LogOut, Menu, MessageSquare, Moon, Plane, Search, Settings,
  Sun, Trophy, User, Users, X, ChevronDown, LayoutGrid,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Emoji } from '@/components/Emoji'
import { UserAvatar } from '@/components/UserAvatar'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { RANK_NAMES, rankForLevel } from '@/lib/gamification'

const navItems = [
  { to: '/home', labelKey: 'nav.home', icon: Home },
  { to: '/explore', labelKey: 'nav.explore', icon: Compass },
  { to: '/activities', labelKey: 'nav.activities', icon: Trophy },
  { to: '/communities', labelKey: 'nav.communities', icon: Users },
  { to: '/messages', labelKey: 'nav.messages', icon: MessageSquare },
  { to: '/aircraft', labelKey: 'nav.aircraft', icon: Plane },
  { to: '/profile/me', labelKey: 'nav.profile', icon: User },
]

function useUnread() {
  const { state } = useStore()
  return useMemo(() => {
    const notifications = state.notifications.filter((n) => !n.read).length
    const messages = state.conversations.reduce((a, c) => a + c.unread, 0)
    return { notifications, messages }
  }, [state.notifications, state.conversations])
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const { me, theme, setTheme, signOut } = useStore()
  const { notifications, messages } = useUnread()
  const location = useLocation()
  const navigate = useNavigate()
  const [drawer, setDrawer] = useState(false)
  const [profileMenu, setProfileMenu] = useState(false)
  const [query, setQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDrawer(false)
    setProfileMenu(false)
  }, [location.pathname])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setProfileMenu(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const { lang } = useI18n()
  const rank = me ? rankForLevel(Math.floor(Math.sqrt(me.xp / 120)) + 1) : null
  const rankName = rank ? RANK_NAMES[rank.id][lang] : ''

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link to="/home" className="mb-4 flex items-center gap-2 px-2 pt-1">
        <Logo />
        <span className="rounded-full bg-sky/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky">
          {t('app.beta')}
        </span>
      </Link>
      {navItems.map((item) => {
        const badge = item.to === '/messages' ? messages : 0
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-all',
                isActive
                  ? 'bg-navy-800 text-sky shadow-sm dark:bg-navy-700'
                  : 'text-navy-600 hover:bg-cloud-200/70 dark:text-cloud-300 dark:hover:bg-navy-700/60',
              )
            }
          >
            <span className="relative">
              <item.icon className="h-5 w-5" />
              {badge > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </span>
            {t(item.labelKey)}
          </NavLink>
        )
      })}
      <NavLink
        to="/notifications"
        className={({ isActive }) =>
          cn(
            'relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-all',
            isActive
              ? 'bg-navy-800 text-sky dark:bg-navy-700'
              : 'text-navy-600 hover:bg-cloud-200/70 dark:text-cloud-300 dark:hover:bg-navy-700/60',
          )
        }
      >
        <span className="relative">
          <Bell className="h-5 w-5" />
          {notifications > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {notifications > 9 ? '9+' : notifications}
            </span>
          )}
        </span>
        {t('nav.notifications')}
      </NavLink>
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-all',
            isActive
              ? 'bg-navy-800 text-sky dark:bg-navy-700'
              : 'text-navy-600 hover:bg-cloud-200/70 dark:text-cloud-300 dark:hover:bg-navy-700/60',
          )
        }
      >
        <Settings className="h-5 w-5" />
        {t('nav.settings')}
      </NavLink>

      <div className="mt-auto space-y-3">
        <div className="rounded-xl bg-gradient-to-br from-navy-700 to-navy-800 p-3.5 text-white">
          <div className="flex items-center justify-between text-xs text-cloud-300">
            <span>{t('profile.rank')}</span>
            <span className="flex items-center gap-1.5">{rank ? (<><Emoji char={rank.icon} />{rankName}</>) : ''}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-950/60">
            <div
              className="h-full rounded-full bg-sky transition-all"
              style={{ width: `${Math.min(100, ((me?.xp ?? 0) % 1440) / 14.4)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-cloud-400">
            {me?.xp ?? 0} {t('profile.xp')}
          </p>
        </div>
        {me && (
          <Link to={`/profile/${me.username}`} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-cloud-200/70 dark:hover:bg-navy-700/60">
            <UserAvatar user={me} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-navy-800 dark:text-cloud-100">{me.displayName}</span>
              <span className="block truncate text-xs text-cloud-500">@{me.username}</span>
            </span>
          </Link>
        )}
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-cloud-100 text-navy-800 dark:bg-navy-950 dark:text-cloud-100">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-cloud-200 bg-white lg:block dark:border-navy-700 dark:bg-navy-800">
        {sidebar}
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 w-72 animate-slide-up bg-white shadow-card-hover dark:bg-navy-800" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDrawer(false)} aria-label={t('common.close')} className="absolute right-3 top-3 rounded-lg p-1.5 text-cloud-500 hover:bg-cloud-100 dark:hover:bg-navy-700">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* top bar */}
        <header className="sticky top-0 z-40 border-b border-cloud-200 bg-white/85 backdrop-blur-md dark:border-navy-700 dark:bg-navy-900/85">
          <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-3 sm:px-5">
            <button onClick={() => setDrawer(true)} aria-label={t('nav.menu')} className="rounded-lg p-2 text-navy-600 hover:bg-cloud-200/70 lg:hidden dark:text-cloud-300 dark:hover:bg-navy-700">
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/home" className="lg:hidden">
              <Logo compact />
            </Link>

            <form
              className="relative hidden max-w-lg flex-1 sm:block"
              onSubmit={(e) => {
                e.preventDefault()
                if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cloud-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('explore.searchPlaceholder')}
                className="h-10 w-full rounded-full border border-cloud-200 bg-cloud-100 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-cloud-400 focus:border-sky focus:bg-white dark:border-navy-700 dark:bg-navy-800 dark:focus:bg-navy-900"
              />
            </form>
            <Link to="/search" className="rounded-lg p-2 text-navy-600 hover:bg-cloud-200/70 sm:hidden dark:text-cloud-300 dark:hover:bg-navy-700" aria-label={t('nav.search')}>
              <Search className="h-5 w-5" />
            </Link>

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? t('common.light') : t('common.dark')}
                className="rounded-lg p-2 text-navy-600 hover:bg-cloud-200/70 dark:text-cloud-300 dark:hover:bg-navy-700"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <Link
                to="/notifications"
                aria-label={t('nav.notifications')}
                className="relative rounded-lg p-2 text-navy-600 hover:bg-cloud-200/70 dark:text-cloud-300 dark:hover:bg-navy-700"
              >
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-navy-900" />
                )}
              </Link>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setProfileMenu((v) => !v)} className="flex items-center gap-1 rounded-lg p-1.5 hover:bg-cloud-200/70 dark:hover:bg-navy-700" aria-label={t('nav.profile')}>
                  <UserAvatar user={me ?? undefined} size="sm" />
                  <ChevronDown className="hidden h-4 w-4 text-cloud-500 sm:block" />
                </button>
                {profileMenu && me && (
                  <div className="absolute right-0 top-12 w-60 animate-scale-in overflow-hidden rounded-xl border border-cloud-200 bg-white py-1.5 shadow-card-hover dark:border-navy-600 dark:bg-navy-900">
                    <div className="flex items-center gap-2.5 px-4 py-2.5">
                      <UserAvatar user={me} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{me.displayName}</p>
                        <p className="truncate text-xs text-cloud-500">@{me.username}</p>
                      </div>
                    </div>
                    <MenuLink to={`/profile/${me.username}`} icon={<User className="h-4 w-4" />} label={t('nav.profile')} />
                    <MenuLink to="/settings" icon={<Settings className="h-4 w-4" />} label={t('nav.settings')} />
                    <MenuLink to="/notifications" icon={<Bell className="h-4 w-4" />} label={t('nav.notifications')} badge={notifications} />
                    <MenuLink to="/aircraft" icon={<LayoutGrid className="h-4 w-4" />} label={t('nav.aircraft')} />
                    <button
                      onClick={() => {
                        signOut()
                        navigate('/auth')
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" /> {t('nav.signOut')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-3 pb-24 pt-5 sm:px-5 lg:pb-10">{children}</main>
      </div>

      {/* bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cloud-200 bg-white/95 backdrop-blur-md lg:hidden dark:border-navy-700 dark:bg-navy-900/95">
        <div className="grid grid-cols-5">
          {[
            { to: '/home', icon: Home, key: 'nav.home', badge: 0 },
            { to: '/explore', icon: Compass, key: 'nav.explore', badge: 0 },
            { to: '/activities', icon: Trophy, key: 'nav.activities', badge: 0 },
            { to: '/messages', icon: MessageSquare, key: 'nav.messages', badge: messages },
            { to: '/profile/me', icon: User, key: 'nav.profile', badge: 0 },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium',
                  isActive ? 'text-sky-600 dark:text-sky' : 'text-cloud-500 dark:text-cloud-400',
                )
              }
            >
              <span className="relative">
                <item.icon className="h-5.5 w-5.5 h-[22px] w-[22px]" />
                {item.badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
              {t(item.key)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function MenuLink({ to, icon, label, badge = 0 }: { to: string; icon: ReactNode; label: string; badge?: number }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-700 hover:bg-cloud-50 dark:text-cloud-200 dark:hover:bg-navy-800">
      {icon}
      <span className="flex-1">{label}</span>
      {badge > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{badge}</span>}
    </Link>
  )
}
