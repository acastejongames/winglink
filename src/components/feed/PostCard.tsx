import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark, Camera, ChevronLeft, ChevronRight, Heart, MessageCircle, MoreHorizontal,
  Newspaper, PlayCircle, Send, Share2, Trash2, Flag, BarChart3, HelpCircle, Smile, UserPlus, X,
} from 'lucide-react'
import type { Comment, Post, User } from '@/lib/types'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { cn, formatCount, timeAgo } from '@/lib/utils'
import { UserAvatar, UserAvatarLink } from '../UserAvatar'
import { RichText } from '../RichText'
import { Badge, Button } from '../ui/Primitives'
import { ReportModal, ShareModal, Lightbox } from '../modals'
import { useToast } from '../ui/Toast'

const REACTIONS = ['👍', '❤️', '🛩️', '✈️', '🔥', '😮']

function PollBlock({ post }: { post: Post }) {
  const { t, lang } = useI18n()
  const { votePoll } = useStore()
  const poll = post.poll!
  const total = poll.options.reduce((a, o) => a + o.votes, 0) || 1
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-medium text-navy-800 dark:text-cloud-100">{poll.question}</p>
      {poll.options.map((opt) => {
        const pct = Math.round((opt.votes / total) * 100)
        const voted = post.votedOptionId === opt.id
        return (
          <button
            key={opt.id}
            disabled={!!post.votedOptionId}
            onClick={() => votePoll(post.id, opt.id)}
            className={cn(
              'relative block w-full overflow-hidden rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors',
              voted
                ? 'border-sky bg-sky/10 font-medium text-navy-800 dark:text-cloud-100'
                : post.votedOptionId
                  ? 'border-cloud-200 text-cloud-500 dark:border-navy-600'
                  : 'border-cloud-200 hover:border-sky dark:border-navy-600',
            )}
          >
            {post.votedOptionId && (
              <span
                className={cn('absolute inset-y-0 left-0', voted ? 'bg-sky/20' : 'bg-cloud-200/60 dark:bg-navy-700/60')}
                style={{ width: `${pct}%` }}
              />
            )}
            <span className="relative flex items-center justify-between gap-2">
              <span>{opt.text}</span>
              {post.votedOptionId && <span className="font-semibold">{pct}%</span>}
            </span>
          </button>
        )
      })}
      <p className="text-xs text-cloud-500">
        {t('post.pollVotes', { n: formatCount(total, lang) })}
        {' · '}
        {t('post.pollEnds', { when: timeAgo(poll.endsAt, lang) })}
        {post.votedOptionId && ` · ${t('post.pollVoted')}`}
      </p>
    </div>
  )
}

function MediaGrid({ post, onOpen }: { post: Post; onOpen: (i: number) => void }) {
  const images = post.images ?? []
  if (!images.length) return null
  if (images.length === 1) {
    return (
      <button onClick={() => onOpen(0)} className="mt-3 block w-full overflow-hidden rounded-xl">
        <img src={images[0]} alt="" loading="lazy" className="max-h-[520px] w-full object-cover transition-transform duration-500 hover:scale-[1.02]" />
      </button>
    )
  }
  return (
    <div className={cn('mt-3 grid gap-1.5 overflow-hidden rounded-xl', images.length === 2 ? 'grid-cols-2' : 'grid-cols-2')}>
      {images.slice(0, 4).map((img, i) => (
        <button
          key={i}
          onClick={() => onOpen(i)}
          className={cn('relative block overflow-hidden', images.length > 2 && i === 0 && 'col-span-2')}
        >
          <img
            src={img}
            alt=""
            loading="lazy"
            className={cn('h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]', images.length > 2 && i === 0 ? 'max-h-[300px]' : 'max-h-[220px]')}
          />
          {i === 3 && images.length > 4 && (
            <span className="absolute inset-0 flex items-center justify-center bg-navy-950/60 text-xl font-bold text-white">+{images.length - 4}</span>
          )}
        </button>
      ))}
    </div>
  )
}

function CommentRow({ post, comment, isReply }: { post: Post; comment: Comment; isReply?: boolean }) {
  const { t, lang } = useI18n()
  const { getUser, addComment, toggleCommentLike, me } = useStore()
  const [replying, setReplying] = useState(false)
  const [text, setText] = useState('')
  const author = getUser(comment.authorId)
  return (
    <div className={cn('flex gap-2.5', isReply && 'ml-9 mt-2')}>
      <UserAvatar user={author} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-cloud-100 px-3.5 py-2.5 dark:bg-navy-700/70">
          <div className="flex items-center gap-2">
            <Link to={`/profile/${author?.username}`} className="text-sm font-semibold text-navy-800 dark:text-cloud-100">
              {author?.displayName ?? '—'}
            </Link>
            {author?.isDemo && <Badge tone="demo">{t('app.demoBadge')}</Badge>}
            <span className="text-xs text-cloud-500">{timeAgo(comment.createdAt, lang)}</span>
          </div>
          <p className="mt-0.5 break-words text-sm text-navy-700 dark:text-cloud-200">
            <RichText text={comment.text} />
          </p>
        </div>
        <div className="mt-1 flex items-center gap-3 pl-1 text-xs text-cloud-500">
          <button onClick={() => toggleCommentLike(post.id, comment.id)} className={cn('flex items-center gap-1 hover:underline', comment.likedByMe && 'text-sky-600 dark:text-sky')}>
            <Heart className={cn('h-3.5 w-3.5', comment.likedByMe && 'fill-current')} /> {comment.likes || ''}
          </button>
          {me && !isReply && (
            <button onClick={() => setReplying((v) => !v)} className="hover:underline">
              {t('common.reply')}
            </button>
          )}
        </div>
        {replying && (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              addComment(post.id, text, comment.id)
              setText('')
              setReplying(false)
            }}
          >
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('post.replyPlaceholder')}
              className="h-9 flex-1 rounded-full border border-cloud-200 bg-cloud-50 px-3.5 text-sm outline-none focus:border-sky dark:border-navy-600 dark:bg-navy-900 dark:text-cloud-100"
            />
            <Button size="sm" type="submit" disabled={!text.trim()}>
              {t('common.send')}
            </Button>
          </form>
        )}
        {comment.replies.map((r) => (
          <CommentRow key={r.id} post={post} comment={r} isReply />
        ))}
      </div>
    </div>
  )
}

export function PostCard({ post, showCommunity }: { post: Post; showCommunity?: boolean }) {
  const { t, lang } = useI18n()
  const { getUser, state, toggleLike, setReaction, toggleSave, addComment, deletePost, me } = useStore()
  const { toast } = useToast()
  const author = getUser(post.authorId)
  const community = post.communityId ? state.communities.find((c) => c.id === post.communityId) : undefined
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [reactionOpen, setReactionOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const reactTimer = useRef<number | null>(null)

  const topReactions = useMemo(
    () =>
      Object.entries(post.reactions)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    [post.reactions],
  )
  const totalReactions = Object.values(post.reactions).reduce((a, b) => a + b, 0)
  const totalComments = post.comments.reduce((a, c) => a + 1 + c.replies.length, 0)
  const isMine = me?.id === post.authorId

  if (!author || state.blocked.includes(post.authorId)) return null

  return (
    <article className="animate-slide-up rounded-2xl border border-cloud-200 bg-white shadow-card dark:border-navy-700 dark:bg-navy-800">
      {/* header */}
      <div className="flex items-start gap-3 px-4 pt-4 sm:px-5">
        <UserAvatarLink user={author} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link to={`/profile/${author.username}`} className="font-semibold text-navy-800 hover:underline dark:text-cloud-50">
              {author.displayName}
            </Link>
            <span className="text-sm text-cloud-500">@{author.username}</span>
            <span className="text-cloud-400">·</span>
            <Link to={`/profile/${author.username}`} className="text-sm text-cloud-500 hover:underline">
              {timeAgo(post.createdAt, lang)}
            </Link>
            {post.isDemo && (
              <Badge tone="demo" title={t('common.demo')}>
                {t('app.demoBadge')}
              </Badge>
            )}
            {post.visibility === 'followers' && <Badge tone="sky">{t('composer.visibilityFollowers')}</Badge>}
          </div>
          {showCommunity && community && (
            <Link to={`/communities/${community.slug}`} className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline dark:text-sky">
              <span className="h-1.5 w-1.5 rounded-full bg-sky" />
              {community.name}
            </Link>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Post menu"
            className="rounded-full p-1.5 text-cloud-500 hover:bg-cloud-100 dark:hover:bg-navy-700"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 w-56 animate-scale-in overflow-hidden rounded-xl border border-cloud-200 bg-white py-1.5 shadow-card-hover dark:border-navy-600 dark:bg-navy-900">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${location.origin}/home?post=${post.id}`)
                  toast(t('common.linkCopied'))
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-navy-700 hover:bg-cloud-50 dark:text-cloud-200 dark:hover:bg-navy-800"
              >
                <Share2 className="h-4 w-4" /> {t('post.copyLink')}
              </button>
              <button
                onClick={() => {
                  setReportOpen(true)
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-navy-700 hover:bg-cloud-50 dark:text-cloud-200 dark:hover:bg-navy-800"
              >
                <Flag className="h-4 w-4" /> {t('post.reportPost')}
              </button>
              {isMine && (
                <button
                  onClick={() => {
                    deletePost(post.id)
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" /> {t('common.delete')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* body */}
      <div className="px-4 pb-2 pt-3 sm:px-5">
        {post.text && (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-navy-700 dark:text-cloud-200">
            <RichText text={post.text} />
          </p>
        )}
        {post.type === 'news' && post.news && (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-cloud-200 bg-cloud-50 p-3 dark:border-navy-600 dark:bg-navy-900/60">
            <Newspaper className="mt-0.5 h-4 w-4 shrink-0 text-sky" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cloud-500">{post.news.source}</p>
              <p className="text-sm font-medium text-navy-800 dark:text-cloud-100">{post.news.headline}</p>
            </div>
          </div>
        )}
        {post.type === 'poll' && post.poll && <PollBlock post={post} />}
        {post.type === 'question' && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky/10 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky">
            <HelpCircle className="h-3.5 w-3.5" /> {t('post.question')}
          </div>
        )}
        {post.type === 'video' && post.video && (
          <div className="relative mt-3 overflow-hidden rounded-xl bg-navy-900">
            <img src={post.video.poster} alt="" loading="lazy" className="max-h-[420px] w-full object-cover opacity-80" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-navy-950/40">
              <PlayCircle className="h-12 w-12 text-white/90" />
              <span className="rounded-full bg-navy-950/70 px-2.5 py-0.5 text-xs font-medium text-white">{post.video.duration}</span>
            </div>
            <p className="bg-navy-900 px-3 py-2 text-xs text-cloud-400">{t('post.videoNote')}</p>
          </div>
        )}
        {post.images && post.images.length > 0 && <MediaGrid post={post} onOpen={(i) => setLightbox(i)} />}
      </div>

      {/* stats */}
      <div className="flex items-center justify-between px-4 pt-1 text-xs text-cloud-500 sm:px-5">
        <div className="flex items-center gap-1">
          {topReactions.map(([emoji, n]) => (
            <span key={emoji} className="flex h-5 w-5 items-center justify-center rounded-full bg-cloud-200 text-[11px] dark:bg-navy-700">
              {emoji}
            </span>
          ))}
          <span className="ml-1">{formatCount(totalReactions + (post.likedByMe && !topReactions.length ? 1 : 0), lang)}</span>
        </div>
        <div className="flex gap-3">
          {totalComments > 0 && <span>{t('post.commentsCount', { n: totalComments })}</span>}
          {post.shares > 0 && <span>{formatCount(post.shares, lang)} {t('post.shares').toLowerCase()}</span>}
        </div>
      </div>

      {/* actions */}
      <div className="mx-4 my-1.5 grid grid-cols-4 border-t border-cloud-200 pt-1 dark:border-navy-700 sm:mx-5">
        <button
          onClick={() => toggleLike(post.id)}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors hover:bg-cloud-100 dark:hover:bg-navy-700',
            post.likedByMe ? 'text-sky-600 dark:text-sky' : 'text-cloud-500',
          )}
        >
          <Heart className={cn('h-4.5 w-4.5 h-[18px] w-[18px]', post.likedByMe && 'fill-current')} />
          {t('post.like')}
        </button>
        <div
          className="relative flex items-center"
          onMouseEnter={() => {
            if (reactTimer.current) window.clearTimeout(reactTimer.current)
            reactTimer.current = window.setTimeout(() => setReactionOpen(true), 350)
          }}
          onMouseLeave={() => {
            if (reactTimer.current) window.clearTimeout(reactTimer.current)
            reactTimer.current = window.setTimeout(() => setReactionOpen(false), 250)
          }}
        >
          <button
            onClick={() => setReactionOpen((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-cloud-500 hover:bg-cloud-100 dark:hover:bg-navy-700"
            aria-label={t('post.addReaction')}
          >
            {post.myReaction ? <span className="text-base leading-none">{post.myReaction}</span> : <Smile className="h-[18px] w-[18px]" />}
            {t('post.reactions')}
          </button>
          {reactionOpen && (
            <div className="absolute -top-11 left-1/2 z-30 flex -translate-x-1/2 animate-scale-in items-center gap-1 rounded-full border border-cloud-200 bg-white px-2 py-1.5 shadow-card-hover dark:border-navy-600 dark:bg-navy-900">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setReaction(post.id, post.myReaction === emoji ? null : emoji)
                    setReactionOpen(false)
                  }}
                  className={cn(
                    'rounded-full p-1 text-xl transition-transform hover:scale-125',
                    post.myReaction === emoji && 'bg-sky/20 scale-110',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-cloud-500 hover:bg-cloud-100 dark:hover:bg-navy-700"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
          {t('common.comment')}
        </button>
        <div className="flex">
          <button
            onClick={() => {
              setShareOpen(true)
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-cloud-500 hover:bg-cloud-100 dark:hover:bg-navy-700"
          >
            <Share2 className="h-[18px] w-[18px]" />
            {t('post.share')}
          </button>
          <button
            onClick={() => toggleSave(post.id)}
            aria-label={post.savedByMe ? t('post.unsave') : t('post.save')}
            className={cn(
              'flex items-center justify-center rounded-lg px-3 py-2 hover:bg-cloud-100 dark:hover:bg-navy-700',
              post.savedByMe ? 'text-amber-500' : 'text-cloud-500',
            )}
          >
            <Bookmark className={cn('h-[18px] w-[18px]', post.savedByMe && 'fill-current')} />
          </button>
        </div>
      </div>

      {/* comments */}
      {showComments && (
        <div className="border-t border-cloud-200 px-4 py-4 sm:px-5 dark:border-navy-700">
          {me && (
            <form
              className="mb-4 flex gap-2.5"
              onSubmit={(e) => {
                e.preventDefault()
                addComment(post.id, commentText)
                setCommentText('')
              }}
            >
              <UserAvatar user={me} size="sm" className="mt-0.5" />
              <div className="relative flex-1">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t('post.commentPlaceholder')}
                  className="h-10 w-full rounded-full border border-cloud-200 bg-cloud-50 pl-4 pr-12 text-sm outline-none focus:border-sky dark:border-navy-600 dark:bg-navy-900 dark:text-cloud-100"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  aria-label={t('post.sendComment')}
                  className="absolute right-1.5 top-1.5 rounded-full p-1.5 text-sky-600 disabled:opacity-30 dark:text-sky"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}
          <div className="space-y-3">
            {post.comments.map((c) => (
              <CommentRow key={c.id} post={post} comment={c} />
            ))}
          </div>
        </div>
      )}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="post" targetId={post.id} />
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${author.displayName}: ${post.text.slice(0, 80)}${post.text.length > 80 ? '…' : ''}`}
        url={`${location.origin}/home?post=${post.id}`}
        postId={post.id}
      />
      <Lightbox
        images={post.images ?? []}
        index={lightbox ?? 0}
        onClose={() => setLightbox(null)}
        onIndex={(i: number) => setLightbox(i)}
        caption={
          <span>
            <strong>{author.displayName}</strong> · {post.text.slice(0, 160)}
          </span>
        }
      />
    </article>
  )
}
