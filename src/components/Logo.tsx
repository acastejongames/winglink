import { cn } from '@/lib/utils'

/**
 * WingLink brand mark: an elegant swept-wing symbol paired with the wordmark.
 */
export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="WingLink logo"
    >
      <rect width="64" height="64" rx="15" fill="#101D30" />
      <path
        d="M9.5 41.5 L31.5 13.5 L36.2 24.6 L25.6 37.2 L32.4 34.8 L53.5 21.5 L40.8 45.5 L34.2 39 L23.4 47.5 Z"
        fill="#70C8FF"
      />
      <path d="M12 50.5 Q32 44.5 52 50.5" stroke="#70C8FF" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.65" />
      <circle cx="47.5" cy="15.5" r="3" fill="#F1F5F9" opacity="0.9" />
    </svg>
  )
}

export function Logo({ compact, light, className }: { compact?: boolean; light?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <LogoMark size={compact ? 30 : 36} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display text-[22px] font-bold tracking-tight',
              light ? 'text-white' : 'text-navy-800 dark:text-cloud-50',
            )}
          >
            Wing<span className="text-sky">Link</span>
          </span>
          <span
            className={cn(
              'mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em]',
              light ? 'text-cloud-300' : 'text-cloud-500 dark:text-cloud-400',
            )}
          >
            Where Aviation Connects
          </span>
        </span>
      )}
    </span>
  )
}
