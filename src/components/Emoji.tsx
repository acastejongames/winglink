import { cn } from '@/lib/utils'
import thumbUp from 'twemoji-svg/1f44d'
import redHeart from 'twemoji-svg/2764'
import airplaneEngine from 'twemoji-svg/1f6e9'
import airplane from 'twemoji-svg/2708'
import fire from 'twemoji-svg/1f525'
import astonishedFace from 'twemoji-svg/1f62e'
import graduationCap from 'twemoji-svg/1f393'
import smallAirplane from 'twemoji-svg/1f6eb'
import star from 'twemoji-svg/2b50'
import sportsMedal from 'twemoji-svg/1f3c6'
import crown from 'twemoji-svg/1f451'
import camera from 'twemoji-svg/1f4f7'
import speechBalloon from 'twemoji-svg/1f4ac'
import handshake from 'twemoji-svg/1f91d'
import house from 'twemoji-svg/1f3e0'
import brain from 'twemoji-svg/1f9e0'
import sunrise from 'twemoji-svg/1f305'
import crescentMoon from 'twemoji-svg/1f319'
import scroll from 'twemoji-svg/1f4dc'
import videoGame from 'twemoji-svg/1f3ae'
import wrench from 'twemoji-svg/1f527'
import telescope from 'twemoji-svg/1f52d'
import helicopter from 'twemoji-svg/1f681'
import partyPopper from 'twemoji-svg/1f389'
import link from 'twemoji-svg/1f517'

/**
 * Professional emoji set — Twemoji (Twitter/X open-source, CC-BY 4.0),
 * bundled locally so every platform renders the same crisp artwork instead
 * of the OS-default glyphs.
 */
const MAP: Record<string, string> = {
  '👍': thumbUp,
  '❤️': redHeart,
  '🛩️': airplaneEngine,
  '✈️': airplane,
  '🔥': fire,
  '😮': astonishedFace,
  '🎓': graduationCap,
  '🛫': smallAirplane,
  '⭐': star,
  '🏅': sportsMedal,
  '👑': crown,
  '📷': camera,
  '💬': speechBalloon,
  '🤝': handshake,
  '🏠': house,
  '🧠': brain,
  '🌅': sunrise,
  '🌙': crescentMoon,
  '📜': scroll,
  '🎮': videoGame,
  '🔧': wrench,
  '🔭': telescope,
  '🚁': helicopter,
  '🎉': partyPopper,
  '🔗': link,
}

export function emojiSrc(char: string): string | undefined {
  return MAP[char]
}

export function Emoji({ char, className }: { char: string; className?: string }) {
  const src = MAP[char]
  if (!src) return <span className={className}>{char}</span>
  return (
    <img
      src={src}
      alt={char}
      draggable={false}
      className={cn('inline-block h-[1.15em] w-[1.15em] align-[-0.15em]', className)}
    />
  )
}
