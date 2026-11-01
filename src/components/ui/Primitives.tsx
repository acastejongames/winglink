import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'; size?: 'sm' | 'md' | 'lg' }) {
  const variants = {
    primary: 'bg-sky text-navy-900 font-semibold hover:bg-sky-400 shadow-sm',
    secondary: 'bg-navy-500 text-white hover:bg-navy-600',
    ghost: 'text-cloud-600 hover:bg-cloud-200/70 dark:text-cloud-300 dark:hover:bg-navy-700/70',
    outline: 'border border-cloud-300 text-cloud-700 hover:border-sky hover:text-navy-800 dark:border-navy-600 dark:text-cloud-200 dark:hover:border-sky dark:hover:text-sky',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  }
  const sizes = {
    sm: 'h-8 px-3 text-sm rounded-lg',
    md: 'h-10 px-4 text-sm rounded-xl',
    lg: 'h-12 px-6 text-base rounded-xl',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

export function Card({ className, children, hover }: { className?: string; children: ReactNode; hover?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-cloud-200 bg-white shadow-card dark:border-navy-700 dark:bg-navy-800',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Badge({ children, tone = 'default', className, ...rest }: { children: ReactNode; tone?: 'default' | 'sky' | 'green' | 'amber' | 'red'; className?: string } & { title?: string }) {
  const tones = {
    default: 'bg-cloud-200 text-cloud-700 dark:bg-navy-700 dark:text-cloud-300',
    sky: 'bg-sky/15 text-sky-600 dark:text-sky',
    green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    red: 'bg-red-500/15 text-red-600 dark:text-red-400',
  }
  return (
    <span title={rest.title} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', tones[tone], className)}>
      {children}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <div className={cn('flex items-center justify-center py-10', className)} role="status" aria-label={t('common.loading')}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cloud-300 border-t-sky dark:border-navy-600 dark:border-t-sky" />
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cloud-300 px-6 py-14 text-center dark:border-navy-600">
      {icon && <div className="mb-3 text-sky">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-navy-800 dark:text-cloud-100">{title}</h3>
      {body && <p className="mt-1 max-w-md text-sm text-cloud-500 dark:text-cloud-400">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Input({ className, label, hint, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-cloud-600 dark:text-cloud-300">{label}</span>}
      <input
        className={cn(
          'h-11 w-full rounded-xl border bg-cloud-50 px-3.5 text-sm text-navy-800 outline-none transition-colors placeholder:text-cloud-400 focus:border-sky focus:ring-2 focus:ring-sky/25 dark:bg-navy-900/60 dark:text-cloud-100 dark:placeholder:text-cloud-500',
          error ? 'border-red-400' : 'border-cloud-200 dark:border-navy-600',
          className,
        )}
        {...props}
      />
      {hint && !error && <span className="mt-1 block text-xs text-cloud-500 dark:text-cloud-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  )
}

export function Textarea({ className, label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-cloud-600 dark:text-cloud-300">{label}</span>}
      <textarea
        className={cn(
          'w-full rounded-xl border border-cloud-200 bg-cloud-50 px-3.5 py-2.5 text-sm text-navy-800 outline-none transition-colors placeholder:text-cloud-400 focus:border-sky focus:ring-2 focus:ring-sky/25 dark:border-navy-600 dark:bg-navy-900/60 dark:text-cloud-100 dark:placeholder:text-cloud-500',
          className,
        )}
        {...props}
      />
    </label>
  )
}

export function Select({ className, label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-cloud-600 dark:text-cloud-300">{label}</span>}
      <select
        className={cn(
          'h-11 w-full rounded-xl border border-cloud-200 bg-cloud-50 px-3 text-sm text-navy-800 outline-none focus:border-sky focus:ring-2 focus:ring-sky/25 dark:border-navy-600 dark:bg-navy-900 dark:text-cloud-100',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky',
        checked ? 'bg-sky' : 'bg-cloud-300 dark:bg-navy-600',
      )}
    >
      <span className={cn('inline-block h-4.5 w-4.5 h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[26px]' : 'translate-x-1')} />
    </button>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const { t } = useI18n()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-navy-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'max-h-[92vh] w-full animate-scale-in overflow-y-auto rounded-t-2xl border border-cloud-200 bg-white shadow-card-hover sm:rounded-2xl dark:border-navy-700 dark:bg-navy-800',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cloud-200 bg-white px-5 py-4 dark:border-navy-700 dark:bg-navy-800">
          <h2 className="font-display text-lg font-semibold text-navy-800 dark:text-cloud-100">{title}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="rounded-lg p-1.5 text-cloud-500 hover:bg-cloud-100 dark:hover:bg-navy-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

export function Tabs({
  tabs,
  active,
  onChange,
  size = 'md',
}: {
  tabs: { id: string; label: string; icon?: ReactNode; count?: number }[]
  active: string
  onChange: (id: string) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky',
            size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
            active === tab.id
              ? 'bg-navy-800 text-sky shadow-sm dark:bg-navy-700 dark:text-sky'
              : 'text-cloud-500 hover:bg-cloud-200/70 dark:text-cloud-400 dark:hover:bg-navy-700/60',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className={cn('rounded-full px-1.5 text-[10px]', active === tab.id ? 'bg-sky/20 text-sky' : 'bg-cloud-300 text-cloud-600 dark:bg-navy-600 dark:text-cloud-300')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function AvatarFrame({ frame, className, children }: { frame: string; className?: string; children: ReactNode }) {
  const rings: Record<string, string> = {
    none: '',
    sky: 'ring-2 ring-sky/70',
    golden: 'ring-2 ring-amber-400/80',
    carbon: 'ring-2 ring-slate-400/80',
  }
  return <div className={cn('rounded-full', rings[frame] ?? '', className)}>{children}</div>
}
