export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export function timeAgo(iso: string, lang: 'en' | 'es' = 'en'): string {
  const diff = Date.now() - new Date(iso).getTime()
  const abs = Math.max(0, diff)
  const en = lang === 'en'
  if (abs < MIN) return en ? 'now' : 'ahora'
  if (abs < HOUR) {
    const m = Math.floor(abs / MIN)
    return en ? `${m}m` : `${m} min`
  }
  if (abs < DAY) {
    const h = Math.floor(abs / HOUR)
    return en ? `${h}h` : `${h} h`
  }
  const d = Math.floor(abs / DAY)
  if (d < 7) return en ? `${d}d` : `${d} d`
  if (d < 30) {
    const w = Math.floor(d / 7)
    return en ? `${w}w` : `${w} sem`
  }
  const date = new Date(iso)
  return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: d > 365 ? 'numeric' : undefined,
  })
}

export function formatCount(n: number, lang: 'en' | 'es' = 'en'): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const v = n / 1000
    return `${v >= 100 ? Math.round(v) : Math.round(v * 10) / 10}${lang === 'es' ? ' mil' : 'K'}`
  }
  const v = n / 1_000_000
  return `${Math.round(v * 10) / 10}${lang === 'es' ? ' M' : 'M'}`
}

export function formatFull(n: number): string {
  return n.toLocaleString('en-US')
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 120)) + 1
}

export function xpForLevel(level: number): number {
  return 120 * (level - 1) ** 2
}

export function levelProgress(xp: number): { level: number; into: number; needed: number; pct: number } {
  const level = levelFromXp(xp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const needed = next - base
  const into = xp - base
  return { level, into, needed, pct: Math.max(2, Math.min(100, Math.round((into / needed) * 100))) }
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || []
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())))
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w]+/g) || []
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())))
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function hoursAgo(h: number): string {
  return new Date(Date.now() - h * HOUR).toISOString()
}

export function daysAgo(d: number): string {
  return new Date(Date.now() - d * DAY).toISOString()
}

export function daysAhead(d: number): string {
  return new Date(Date.now() + d * DAY).toISOString()
}

/**
 * Legacy migration only: verifies pre-vault accounts from the old plaintext
 * build so they can be re-wrapped into the encrypted vault on sign-in.
 * Never used for new accounts — those store no password material at all.
 */
export function hashPassword(pw: string): string {
  const s = 'winglink::' + pw
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

/**
 * Absolute in-app URL that respects the deployment base path
 * (e.g. '/winglink/' on GitHub Pages, '/' in local dev).
 */
export function appUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  const p = path.replace(/^\/+/, '')
  return `${window.location.origin}${base}${p}`
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Compress an uploaded image to a manageable data URL for local persistence. */
export function fileToCompressedDataUrl(file: File, maxDim = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read-failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode-failed'))
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas-failed'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  return new Promise((resolve, reject) => {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    try {
      document.execCommand('copy')
      resolve()
    } catch (e) {
      reject(e)
    } finally {
      document.body.removeChild(el)
    }
  })
}
