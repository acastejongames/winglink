import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Clock, Flame, Play, RotateCcw, Timer, Trophy, XCircle,
} from 'lucide-react'
import type { Difficulty, QuizMode, QuizQuestion } from '@/lib/types'
import { quizQuestions } from '@/lib/demo/quiz'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/Toast'
import { Badge, Button, Card, EmptyState, Tabs } from '@/components/ui/Primitives'
import { cn, timeAgo } from '@/lib/utils'
import { UserAvatar } from '@/components/UserAvatar'
import { RANK_NAMES, rankForLevel } from '@/lib/gamification'
import { demoLeaderboards } from '@/lib/demo/quiz'

const MODE_LABEL: Record<QuizMode, string> = {
  aircraft: 'activities.guessAircraft',
  manufacturer: 'activities.manufacturer',
  cockpit: 'activities.cockpit',
  silhouette: 'activities.silhouette',
  country: 'activities.country',
  trivia: 'activities.trivia',
  history: 'activities.history',
  comparison: 'activities.comparison',
}

const ROUND_LENGTH = 8

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildRound(mode: QuizMode, difficulty: Difficulty): QuizQuestion[] {
  const pool = quizQuestions.filter((q) => q.mode === mode && q.difficulty === difficulty)
  const fallback = quizQuestions.filter((q) => q.mode === mode)
  const chosen = shuffle(pool.length >= ROUND_LENGTH ? pool : [...pool, ...fallback]).slice(0, ROUND_LENGTH)
  return chosen
}

const XP_BY_DIFF: Record<Difficulty, number> = { easy: 8, medium: 12, hard: 16 }

export default function Quiz() {
  const { mode: modeParam } = useParams<{ mode: string }>()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const { me, state, addQuizResult } = useStore()
  const { toast } = useToast()
  const mode = (modeParam ?? 'aircraft') as QuizMode
  const modeLabel = t(MODE_LABEL[mode] ?? 'activities.guessAircraft')

  const [phase, setPhase] = useState<'setup' | 'playing' | 'results'>('setup')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [useTimer, setUseTimer] = useState(true)
  const [round, setRound] = useState<QuizQuestion[]>([])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(15)
  const [earnedXp, setEarnedXp] = useState(0)
  const timerRef = useRef<number | null>(null)

  const question = round[idx]

  const start = () => {
    const r = buildRound(mode, difficulty)
    if (!r.length) {
      toast(t('error.generic'), 'info')
      return
    }
    setRound(r)
    setIdx(0)
    setPicked(null)
    setCorrectCount(0)
    setStreak(0)
    setEarnedXp(0)
    setTimeLeft(15)
    setPhase('playing')
  }

  const finishRound = useCallback(
    (score: number, xp: number) => {
      addQuizResult(mode, difficulty, score, round.length || ROUND_LENGTH, xp)
      setPhase('results')
    },
    [addQuizResult, difficulty, mode, round.length],
  )

  const advance = useCallback(
    (wasCorrect: boolean, bonus = 0) => {
      const score = correctCount + (wasCorrect ? 1 : 0)
      const xp = earnedXp + (wasCorrect ? XP_BY_DIFF[difficulty] + bonus : 0)
      setCorrectCount(score)
      setEarnedXp(xp)
      if (idx + 1 >= round.length) {
        finishRound(score, xp)
      } else {
        setIdx((i) => i + 1)
        setPicked(null)
        setTimeLeft(15)
      }
    },
    [correctCount, difficulty, earnedXp, finishRound, idx, round.length],
  )

  const pick = (i: number) => {
    if (picked !== null) return
    const answer = question.mode === 'comparison' ? question.answer : question.answer
    const wasCorrect = i === answer
    setPicked(i)
    if (wasCorrect) {
      setStreak((s) => s + 1)
      const bonus = useTimer && timeLeft > 10 ? 4 : 0
      window.setTimeout(() => advance(true, useTimer ? bonus : 0), 1300)
    } else {
      setStreak(0)
      window.setTimeout(() => advance(false), 2100)
    }
  }

  // countdown
  useEffect(() => {
    if (phase !== 'playing' || !useTimer || picked !== null) return
    if (timeLeft <= 0) {
      setStreak(0)
      const timer = window.setTimeout(() => advance(false), 400)
      return () => window.clearTimeout(timer)
    }
    timerRef.current = window.setTimeout(() => setTimeLeft((v) => v - 1), 1000)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [phase, useTimer, timeLeft, picked, advance])

  const myRecords = useMemo(() => {
    const records = state.quizRecords
    const best = records.reduce((a, r) => Math.max(a, r.score), 0)
    const perfect = records.filter((r) => r.score === r.total).length
    return { best, played: records.length, perfect, records }
  }, [state.quizRecords])

  const leaderboard = useMemo(() => {
    const rows = demoLeaderboards.weekly.filter((r) => r.userId !== me?.id).map((r) => ({ ...r, isMe: false }))
    if (me) {
      const myScore = state.quizRecords.reduce((a, r) => a + r.xp, 0)
      rows.push({ userId: me.id, score: myScore, isMe: true })
    }
    return rows.sort((a, b) => b.score - a.score).slice(0, 10)
  }, [me, state.quizRecords])

  if (!Object.keys(MODE_LABEL).includes(mode)) {
    return <EmptyState title={t('error.notFound')} body={t('error.notFoundBody')} action={<Button onClick={() => navigate('/activities')}>{t('common.back')}</Button>} />
  }

  // ── SETUP ────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Link to="/activities" className="inline-flex items-center gap-1.5 text-sm text-cloud-500 hover:text-sky">
          <ArrowLeft className="h-4 w-4" /> {t('quiz.backToActivities')}
        </Link>
        <Card className="overflow-hidden">
          {questionPreview(mode)}
          <div className="space-y-5 p-6">
            <div>
              <h1 className="font-display text-2xl font-bold">{modeLabel}</h1>
              <p className="mt-1 text-sm text-cloud-500">{t('quiz.startHint')}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-cloud-600 dark:text-cloud-300">{t('quiz.difficulty')}</p>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-sm font-semibold transition-colors',
                      difficulty === d
                        ? 'border-sky bg-sky/10 text-sky-600 dark:text-sky'
                        : 'border-cloud-200 text-cloud-600 hover:border-sky/50 dark:border-navy-600 dark:text-cloud-300',
                    )}
                  >
                    {t(`quiz.${d}`)}
                    <span className="mt-0.5 block text-[10px] font-normal text-cloud-500">+{XP_BY_DIFF[d]} XP / ✓</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between rounded-xl border border-cloud-200 px-4 py-3 dark:border-navy-600">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Timer className="h-4 w-4 text-sky" /> {t('quiz.timer')}
              </span>
              <span className="flex items-center gap-2 text-xs text-cloud-500">
                {useTimer ? t('quiz.timerOn') : t('quiz.timerOff')}
                <button
                  role="switch"
                  aria-checked={useTimer}
                  onClick={() => setUseTimer((v) => !v)}
                  className={cn('relative h-6 w-11 rounded-full transition-colors', useTimer ? 'bg-sky' : 'bg-cloud-300 dark:bg-navy-600')}
                >
                  <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition-all', useTimer ? 'left-6' : 'left-1')} />
                </button>
              </span>
            </label>
            <div className="flex items-center justify-between">
              <p className="text-sm text-cloud-500">
                {t('quiz.rounds')}: {ROUND_LENGTH} · {t('quiz.bestScore', { n: myRecords.best })}
              </p>
              <Button size="lg" onClick={start}>
                <Play className="h-4 w-4" /> {t('quiz.start')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // ── RESULTS ──────────────────────────────────────────────────────
  if (phase === 'results') {
    const accuracy = Math.round((correctCount / (round.length || 1)) * 100)
    const isBest = correctCount > 0 && correctCount >= myRecords.best
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <Card className="p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-amber-400" />
          <h1 className="mt-3 font-display text-2xl font-bold">{t('quiz.results')}</h1>
          <p className="mt-1 text-sm text-cloud-500">{modeLabel} · {t(`quiz.${difficulty}`)}</p>
          <p className="mt-6 font-display text-6xl font-bold text-sky">
            {correctCount}<span className="text-3xl text-cloud-400"> / {round.length}</span>
          </p>
          {isBest && (
            <Badge tone="amber" className="mt-3">
              <Flame className="h-3 w-3" /> {t('quiz.personalBest')}
            </Badge>
          )}
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-cloud-100 py-3 dark:bg-navy-900">
              <p className="font-display text-xl font-bold">{accuracy}%</p>
              <p className="text-[11px] text-cloud-500">{t('quiz.accuracy')}</p>
            </div>
            <div className="rounded-xl bg-cloud-100 py-3 dark:bg-navy-900">
              <p className="font-display text-xl font-bold text-sky">+{earnedXp}</p>
              <p className="text-[11px] text-cloud-500">{t('profile.xp')}</p>
            </div>
            <div className="rounded-xl bg-cloud-100 py-3 dark:bg-navy-900">
              <p className="font-display text-xl font-bold">{myRecords.best}</p>
              <p className="text-[11px] text-cloud-500">{t('activities.recordBest')}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => setPhase('setup')}>
              <ArrowLeft className="h-4 w-4" /> {t('quiz.backToActivities')}
            </Button>
            <Button onClick={start}>
              <RotateCcw className="h-4 w-4" /> {t('quiz.playAgain')}
            </Button>
          </div>
        </Card>

        {/* leaderboards */}
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display font-semibold">
            <Trophy className="h-4 w-4 text-sky" /> {t('activities.leaderboards')} · {t('activities.leaderboardWeekly')}
          </h2>
          <ol className="space-y-2">
            {leaderboard.map((row, i) => {
              const user = state.users.find((u) => u.id === row.userId)
              return (
                <li
                  key={row.userId}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2',
                    row.isMe && 'bg-sky/10 ring-1 ring-sky/40',
                  )}
                >
                  <span className={cn('w-6 text-center font-display font-bold', i < 3 ? 'text-amber-500' : 'text-cloud-400')}>{i + 1}</span>
                  <UserAvatar user={user} size="xs" />
                  <span className="flex-1 truncate text-sm font-medium">
                    {row.isMe ? t('activities.you') : user?.displayName}
                  </span>
                  <span className="text-sm font-semibold text-sky-600 dark:text-sky">{row.score.toLocaleString()} XP</span>
                </li>
              )
            })}
          </ol>
        </Card>

        {myRecords.records.length > 0 && (
          <Card className="p-5">
            <h2 className="mb-3 font-display font-semibold">{t('quiz.history')}</h2>
            <div className="space-y-2">
              {myRecords.records.slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl bg-cloud-100 px-3.5 py-2.5 text-sm dark:bg-navy-900">
                  <span className="font-medium">{t(MODE_LABEL[r.mode] ?? '')}</span>
                  <span className="text-cloud-500">{t(`quiz.${r.difficulty}`)} · {timeAgo(r.playedAt, lang)}</span>
                  <span className="font-display font-bold">
                    {r.score}/{r.total} <span className="text-sky">+{r.xp} XP</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  // ── PLAYING ──────────────────────────────────────────────────────
  if (!question) return <SpinnerInline />
  const answer = question.answer as number
  const answered = picked !== null

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setPhase('setup')} className="inline-flex items-center gap-1.5 text-sm text-cloud-500 hover:text-sky">
          <ArrowLeft className="h-4 w-4" /> {t('quiz.quit')}
        </button>
        <div className="flex items-center gap-3 text-sm font-medium">
          <span className="text-cloud-500">{t('quiz.questionOf', { n: idx + 1, total: round.length })}</span>
          <span className="rounded-full bg-sky/15 px-2.5 py-0.5 text-sky-600 dark:text-sky">
            {t('quiz.score')}: {correctCount}
          </span>
          {streak > 1 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-amber-500">
              <Flame className="h-3.5 w-3.5" /> {streak}
            </span>
          )}
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-cloud-200 dark:bg-navy-700">
        <div className="h-full rounded-full bg-sky transition-all duration-300" style={{ width: `${((idx + (answered ? 1 : 0)) / round.length) * 100}%` }} />
      </div>

      <Card className="overflow-hidden">
        {/* visual */}
        {(question.mode === 'aircraft' || question.mode === 'manufacturer' || question.mode === 'cockpit' || question.mode === 'silhouette' || question.mode === 'country') && (
          <div className="relative aspect-[16/9] bg-navy-900">
            <img
              src={question.image}
              alt=""
              className={cn('h-full w-full object-cover', question.mode === 'silhouette' && 'brightness-0 saturate-0 opacity-95')}
            />
            {useTimer && (
              <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-navy-950/80 px-3 py-1.5 text-sm font-bold text-white backdrop-blur">
                <Clock className={cn('h-4 w-4', timeLeft <= 5 && 'text-red-400')} />
                <span className={cn(timeLeft <= 5 && 'animate-pulse-soft text-red-400')}>{timeLeft}</span>
              </div>
            )}
          </div>
        )}
        {question.mode === 'comparison' && (
          <div className="grid grid-cols-2 gap-px bg-cloud-200 dark:bg-navy-700">
            {[question.left, question.right].map((side, i) => (
              <div key={i} className="bg-white dark:bg-navy-800">
                <div className="aspect-[4/3] bg-navy-900">
                  <img src={side.image} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="p-3 text-center">
                  <p className="text-sm font-semibold">{side.name}</p>
                  <p className="text-xs text-cloud-500">{side.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-5">
          <h2 className="font-display text-lg font-semibold">
            {lang === 'es' && question.promptEs ? question.promptEs : question.prompt}
          </h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {question.mode === 'comparison'
              ? [question.left.name, question.right.name].map((opt, i) => (
                  <OptionButton
                    key={i}
                    label={opt}
                    state={answered ? (i === answer ? 'correct' : i === picked ? 'wrong' : 'idle') : 'idle'}
                    onClick={() => pick(i)}
                  />
                ))
              : question.options.map((opt, i) => (
                  <OptionButton
                    key={i}
                    label={opt}
                    state={answered ? (i === answer ? 'correct' : i === picked ? 'wrong' : 'idle') : 'idle'}
                    onClick={() => pick(i)}
                  />
                ))}
          </div>
          {answered && (
            <div className={cn('mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm', picked === answer ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400')}>
              {picked === answer ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>
                <strong>{picked === answer ? t('quiz.correct') : t('quiz.incorrect', { answer: question.mode === 'comparison' ? (answer === 0 ? question.left.name : question.right.name) : question.options[answer] })}</strong>{' '}
                {lang === 'es' && question.factEs ? question.factEs : question.fact}
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function OptionButton({ label, state, onClick }: { label: string; state: 'idle' | 'correct' | 'wrong'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={state !== 'idle'}
      className={cn(
        'rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
        state === 'idle' && 'border-cloud-200 hover:border-sky hover:bg-sky/5 dark:border-navy-600',
        state === 'correct' && 'border-emerald-400 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
        state === 'wrong' && 'border-red-400 bg-red-500/15 text-red-600 dark:text-red-300',
      )}
    >
      {label}
    </button>
  )
}

function SpinnerInline() {
  return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-cloud-300 border-t-sky" /></div>
}

function questionPreview(mode: QuizMode) {
  const img =
    mode === 'cockpit' ? 'images/cockpit-fighter.jpg'
    : mode === 'silhouette' ? 'images/concorde.jpg'
    : mode === 'history' ? 'images/spitfire.jpg'
    : mode === 'trivia' ? 'images/cockpit-airliner.jpg'
    : mode === 'comparison' ? 'images/f22-mountains.jpg'
    : mode === 'manufacturer' ? 'images/a350.jpg'
    : mode === 'country' ? 'images/gripen.jpg'
    : 'images/f35.jpg'
  return (
    <div className="relative aspect-[21/9] bg-navy-900">
      <img src={img} alt="" className={cn('h-full w-full object-cover', mode === 'silhouette' && 'brightness-0 saturate-0')} />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent" />
    </div>
  )
}
