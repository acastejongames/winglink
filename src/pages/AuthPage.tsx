import { useState } from 'react'
import { CheckCircle2, Globe2, Plane, ShieldCheck, Sparkles } from 'lucide-react'
import { Logo, LogoMark } from '@/components/Logo'
import { Button, Card, Input } from '@/components/ui/Primitives'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const INTEREST_OPTIONS = [
  'Aircraft Spotting', 'Commercial Aviation', 'Military Aviation', 'Flight Simulation',
  'Aviation History', 'Photography', 'Helicopters', 'Aerospace',
]

export default function AuthPage() {
  const { t, lang, setLang } = useI18n()
  const { signIn, signUp, signInDemo } = useStore()
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [ageOk, setAgeOk] = useState(false)
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res =
      mode === 'in'
        ? signIn(email, password)
        : (() => {
            if (!ageOk) return { ok: false, error: t('auth.errAge') }
            return signUp({ email, username, displayName, password, interests })
          })()
    if (!res.ok && 'error' in res && res.error) setError(res.error)
  }

  return (
    <div className="min-h-screen bg-navy-950 text-cloud-100">
      {/* hero visual */}
      <div className="relative overflow-hidden">
        <img src="images/f22-sunset.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/60 via-navy-950/80 to-navy-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(112,200,255,0.18),transparent_55%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8">
          <header className="flex items-center justify-between">
            <Logo light />
            <button
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-cloud-200 hover:border-sky/60 hover:text-sky"
            >
              <Globe2 className="h-3.5 w-3.5" />
              {lang === 'en' ? 'Español' : 'English'}
            </button>
          </header>

          <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-2">
            {/* pitch */}
            <div className="max-w-xl animate-slide-up">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-sky/10 px-3 py-1 text-xs font-medium text-sky">
                <Plane className="h-3.5 w-3.5" />
                {t('footer.free')} · {t('footer.noAds')}
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
                {t('auth.title')}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-cloud-300">{t('auth.subtitle')}</p>
              <ul className="mt-8 space-y-3 text-sm text-cloud-300">
                {[
                  { icon: <Sparkles className="h-4 w-4" />, text: t('activities.subtitle') },
                  { icon: <ShieldCheck className="h-4 w-4" />, text: t('settings.aboutBody').slice(0, 120) + '…' },
                  { icon: <Globe2 className="h-4 w-4" />, text: t('footer.safety') },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-sky">{item.icon}</span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            {/* form card */}
            <Card className="animate-slide-up border-white/10 bg-white/[0.97] p-6 shadow-card-hover sm:p-8 dark:bg-navy-900/95">
              <div className="mb-5 flex gap-1 rounded-xl bg-cloud-100 p-1 dark:bg-navy-800">
                {(['up', 'in'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m)
                      setError('')
                    }}
                    className={cn(
                      'flex-1 rounded-lg py-2 text-sm font-semibold transition-colors',
                      mode === m ? 'bg-white text-navy-800 shadow-sm dark:bg-navy-700 dark:text-sky' : 'text-cloud-500',
                    )}
                  >
                    {m === 'up' ? t('auth.signUp') : t('auth.signIn')}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-4">
                {mode === 'up' && (
                  <AuthDarkInput label={t('auth.displayName')} value={displayName} onChange={setDisplayName} hint={t('auth.displayNameHint')} />
                )}
                {mode === 'up' && (
                  <AuthDarkInput label={t('auth.username')} value={username} onChange={setUsername} placeholder="spotter_jane" />
                )}
                <AuthDarkInput label={t('auth.email')} value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
                <AuthDarkInput label={t('auth.password')} value={password} onChange={setPassword} type="password" placeholder="••••••••" />

                {mode === 'up' && (
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-cloud-300">{t('auth.interests')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {INTEREST_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setInterests((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]))}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                            interests.includes(opt)
                              ? 'border-sky bg-sky/20 text-sky'
                              : 'border-cloud-300 text-cloud-400 hover:border-sky/50 dark:border-navy-600',
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {mode === 'up' && (
                  <label className="flex items-start gap-2.5 text-xs leading-relaxed text-cloud-400">
                    <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} className="mt-0.5 h-4 w-4 accent-sky" />
                    {t('auth.ageConfirm')}
                  </label>
                )}

                {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>}

                <Button type="submit" size="lg" className="w-full">
                  {mode === 'up' ? t('auth.createCta') : t('auth.signIn')}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-cloud-400">
                <span className="h-px flex-1 bg-cloud-300/30" />
                ·
                <span className="h-px flex-1 bg-cloud-300/30" />
              </div>

              <Button variant="outline" className="w-full" onClick={signInDemo}>
                <LogoMark size={18} />
                {t('auth.demoSignIn')}
              </Button>
              <p className="mt-2 text-center text-[11px] text-cloud-500">{t('auth.demoSignInHint')}</p>
              <p className="mt-4 text-center text-[11px] leading-relaxed text-cloud-500">{t('auth.localNote')}</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthDarkInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-cloud-300">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-cloud-300/20 bg-white/60 px-3.5 text-sm text-navy-800 outline-none transition-colors placeholder:text-cloud-400 focus:border-sky focus:ring-2 focus:ring-sky/25 dark:bg-navy-800 dark:text-cloud-100"
      />
      {hint && <span className="mt-1 block text-xs text-cloud-500">{hint}</span>}
    </label>
  )
}
