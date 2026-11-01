import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Renders post/comment text with hashtags and @mentions linked. */
export function RichText({ text, onHashtag }: { text: string; onHashtag?: (tag: string) => void }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+|@[\w]+)/gu)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          const tag = part.slice(1)
          if (onHashtag) {
            return (
              <button
                key={i}
                onClick={() => onHashtag(tag)}
                className="font-medium text-sky-600 hover:underline dark:text-sky"
              >
                {part}
              </button>
            )
          }
          return (
            <Link key={i} to={`/search?q=%23${encodeURIComponent(tag)}`} className="font-medium text-sky-600 hover:underline dark:text-sky">
              {part}
            </Link>
          )
        }
        if (part.startsWith('@')) {
          const username = part.slice(1)
          return (
            <Link key={i} to={`/profile/${username}`} className="font-medium text-navy-600 hover:underline dark:text-sky-200">
              {part}
            </Link>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

export function SectionHeader({ title, action, icon }: { title: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold text-navy-800 dark:text-cloud-100">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  )
}
