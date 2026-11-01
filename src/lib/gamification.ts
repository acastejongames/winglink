import type { BadgeDef, Rank } from './types'

export const RANKS: Rank[] = [
  { id: 'cadet', minLevel: 1, icon: '🎓' },
  { id: 'aviator', minLevel: 4, icon: '🛩️' },
  { id: 'first-officer', minLevel: 8, icon: '✈️' },
  { id: 'captain', minLevel: 12, icon: '🛫' },
  { id: 'squadron-leader', minLevel: 16, icon: '⭐' },
  { id: 'wing-commander', minLevel: 20, icon: '🏅' },
  { id: 'air-marshal', minLevel: 25, icon: '👑' },
]

export const RANK_NAMES: Record<string, { en: string; es: string }> = {
  cadet: { en: 'Cadet', es: 'Cadete' },
  aviator: { en: 'Aviator', es: 'Aviador' },
  'first-officer': { en: 'First Officer', es: 'Primer oficial' },
  captain: { en: 'Captain', es: 'Capitán' },
  'squadron-leader': { en: 'Squadron Leader', es: 'Líder de escuadrón' },
  'wing-commander': { en: 'Wing Commander', es: 'Comandante de ala' },
  'air-marshal': { en: 'Air Marshal', es: 'Mariscal del aire' },
}

export function rankForLevel(level: number): Rank {
  let current = RANKS[0]
  for (const r of RANKS) if (level >= r.minLevel) current = r
  return current
}

export function nextRank(level: number): Rank | null {
  return RANKS.find((r) => r.minLevel > level) ?? null
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: 'first-post', icon: '✈️', name: 'First Flight', nameEs: 'Primer vuelo', desc: 'Published your first post', descEs: 'Publicaste tu primera publicación' },
  { id: 'spotter', icon: '📷', name: 'Sharpshooter', nameEs: 'Tirador certero', desc: 'Shared 5 photo posts', descEs: 'Compartiste 5 publicaciones con fotos' },
  { id: 'conversation-starter', icon: '💬', name: 'Conversation Starter', nameEs: 'Iniciador de conversación', desc: 'Wrote 10 comments', descEs: 'Escribiste 10 comentarios' },
  { id: 'connector', icon: '🤝', name: 'Connector', nameEs: 'Conector', desc: 'Followed 10 fellow enthusiasts', descEs: 'Seguiste a 10 entusiastas' },
  { id: 'community-builder', icon: '🏠', name: 'Community Builder', nameEs: 'Constructor de comunidad', desc: 'Joined 3 communities', descEs: 'Te uniste a 3 comunidades' },
  { id: 'quiz-ace', icon: '🧠', name: 'Quiz Ace', nameEs: 'As del quiz', desc: 'Completed 5 activity rounds', descEs: 'Completaste 5 rondas de actividad' },
  { id: 'golden-hour', icon: '🌅', name: 'Golden Hour', nameEs: 'Hora dorada', desc: 'Reached level 5', descEs: 'Alcanzaste el nivel 5' },
  { id: 'night-ops', icon: '🌙', name: 'Night Ops', nameEs: 'Operaciones nocturnas', desc: 'Reached level 6', descEs: 'Alcanzaste el nivel 6' },
  { id: 'history-buff', icon: '📜', name: 'History Buff', nameEs: 'Aficionado a la historia', desc: 'Reached level 7', descEs: 'Alcanzaste el nivel 7' },
  { id: 'verified-sky', icon: '⭐', name: 'Trusted Voice', nameEs: 'Voz de confianza', desc: 'Reached level 9', descEs: 'Alcanzaste el nivel 9' },
  { id: 'sim-squadron', icon: '🎮', name: 'Sim Squadron', nameEs: 'Escuadrón simulado', desc: 'Reached level 10', descEs: 'Alcanzaste el nivel 10' },
  { id: 'wrench', icon: '🔧', name: 'Wrench', nameEs: 'Llave inglesa', desc: 'Reached level 11', descEs: 'Alcanzaste el nivel 11' },
  { id: 'lens', icon: '🔭', name: 'Long Lens', nameEs: 'Largo objetivo', desc: 'Reached level 13', descEs: 'Alcanzaste el nivel 13' },
  { id: 'rotorhead', icon: '🚁', name: 'Rotorhead', nameEs: 'Cabeza de rotor', desc: 'Reached level 14', descEs: 'Alcanzaste el nivel 14' },
]

export const BADGE_MAP: Record<string, BadgeDef> = Object.fromEntries(BADGE_DEFS.map((b) => [b.id, b]))

/** Cosmetic frames unlocked by level (all free — no paid advantages, ever). */
export const FRAMES: { id: string; level: number; label: string; css: string }[] = [
  { id: 'none', level: 1, label: 'Standard', css: '' },
  { id: 'sky', level: 5, label: 'Sky ring', css: 'ring-2 ring-sky/70' },
  { id: 'golden', level: 9, label: 'Golden hour', css: 'ring-2 ring-amber-400/80' },
  { id: 'carbon', level: 13, label: 'Carbon', css: 'ring-2 ring-slate-400/80' },
]

export const LEVEL_BADGES: { level: number; badge: string }[] = [
  { level: 5, badge: 'golden-hour' },
  { level: 6, badge: 'night-ops' },
  { level: 7, badge: 'history-buff' },
  { level: 9, badge: 'verified-sky' },
  { level: 10, badge: 'sim-squadron' },
  { level: 11, badge: 'wrench' },
  { level: 13, badge: 'lens' },
  { level: 14, badge: 'rotorhead' },
]
