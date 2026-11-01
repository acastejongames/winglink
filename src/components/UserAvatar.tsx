import { Link } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

const sizeMap = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
}

const frameMap: Record<string, string> = {
  none: '',
  sky: 'ring-2 ring-sky/70',
  golden: 'ring-2 ring-amber-400/80',
  carbon: 'ring-2 ring-slate-400/80',
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const palette = ['#1C3552', '#0A7ABD', '#3DB4FF', '#334155', '#0F9AEB']
function hashColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973
  return palette[h % palette.length]
}

export function UserAvatar({ user, size = 'md', className, ring }: { user?: User; size?: keyof typeof sizeMap; className?: string; ring?: boolean }) {
  const [failed, setFailed] = useState(false)
  const name = user?.displayName ?? '?'
  const frame = ring === false ? '' : frameMap[user?.frame ?? 'none'] ?? ''
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-500 font-semibold text-white',
        sizeMap[size],
        frame,
        className,
      )}
      style={!user || failed ? { background: hashColor(user?.username ?? name) } : undefined}
      aria-hidden={!user}
    >
      {user && user.avatar && !failed ? (
        <img
          src={user.avatar}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  )
}

export function UserAvatarLink({ user, size = 'md', className }: { user?: User; size?: keyof typeof sizeMap; className?: string }) {
  if (!user) return <UserAvatar user={user} size={size} className={className} />
  return (
    <Link to={`/profile/${user.username}`} className={cn('inline-flex', className)} aria-label={user.displayName}>
      <UserAvatar user={user} size={size} />
    </Link>
  )
}
