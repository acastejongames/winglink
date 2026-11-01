import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, MessageSquarePlus, Send, Users } from 'lucide-react'
import type { Message } from '@/lib/types'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge, Button, Card, EmptyState, Select } from '@/components/ui/Primitives'
import { RichText } from '@/components/RichText'
import { aircraftMap } from '@/lib/content/aircraft'
import { Emoji } from '@/components/Emoji'
import { cn, fileToCompressedDataUrl, timeAgo } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

export default function Messages() {
  const { id } = useParams<{ id?: string }>()
  const { t, lang } = useI18n()
  const { state, me, sendMessage, markConversationRead, ensureConversationWith, getUser } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const conversation = state.conversations.find((c) => c.id === id)
  const others = conversation ? conversation.participantIds.filter((p) => p !== me?.id).map((pid) => getUser(pid)).filter(Boolean) : []
  const title = conversation
    ? conversation.name ?? others[0]?.displayName ?? t('messages.title')
    : t('messages.title')

  const filtered = state.conversations.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const names = [c.name, ...c.participantIds.map((p) => getUser(p)?.displayName ?? '')].join(' ').toLowerCase()
    return names.includes(q)
  })

  useEffect(() => {
    if (conversation?.unread) markConversationRead(conversation.id)
  }, [conversation?.id, conversation?.unread, markConversationRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages.length])

  const send = () => {
    if (!conversation || !text.trim()) return
    sendMessage(conversation.id, { kind: 'text', text: text.trim() })
    setText('')
  }

  const attach = async (file: File | null) => {
    if (!file || !conversation) return
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 1200, 0.75)
      sendMessage(conversation.id, { kind: 'image', image: dataUrl })
    } catch {
      toast(t('composer.mediaTooBig'), 'info')
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid h-[calc(100vh-8.5rem)] grid-cols-1 overflow-hidden rounded-2xl border border-cloud-200 bg-white shadow-card dark:border-navy-700 dark:bg-navy-800 sm:h-[calc(100vh-7.5rem)] sm:grid-cols-[320px_1fr] lg:h-[calc(100vh-6.5rem)]">
        {/* conversation list */}
        <div className={cn('flex min-h-0 flex-col border-r border-cloud-200 dark:border-navy-700', conversation && 'hidden sm:flex')}>
          <div className="border-b border-cloud-200 p-4 dark:border-navy-700">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-xl font-bold">{t('messages.title')}</h1>
              <button onClick={() => setNewOpen((v) => !v)} aria-label={t('messages.new')} className="rounded-lg p-2 text-sky-600 hover:bg-sky/10 dark:text-sky">
                <MessageSquarePlus className="h-5 w-5" />
              </button>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('messages.search')}
              className="mt-3 h-9 w-full rounded-full border border-cloud-200 bg-cloud-100 px-4 text-sm outline-none focus:border-sky dark:border-navy-600 dark:bg-navy-900"
            />
            {newOpen && (
              <div className="mt-3 rounded-xl border border-cloud-200 p-3 dark:border-navy-600">
                <p className="mb-2 text-xs font-semibold uppercase text-cloud-500">{t('messages.new')}</p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {state.users
                    .filter((u) => u.id !== me?.id && !state.blocked.includes(u.id))
                    .slice(0, 8)
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          const convId = ensureConversationWith(u.id)
                          setNewOpen(false)
                          navigate(`/messages/${convId}`)
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-cloud-100 dark:hover:bg-navy-700"
                      >
                        <UserAvatar user={u} size="xs" />
                        {u.displayName}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.map((c) => {
              const other = c.participantIds.filter((p) => p !== me?.id).map((p) => getUser(p)).find(Boolean)
              const last = c.messages[c.messages.length - 1]
              const active = c.id === id
              const label = last
                ? last.kind === 'text'
                  ? last.text
                  : last.kind === 'image'
                    ? <Emoji char="📷" />
                    : last.kind === 'post'
                      ? <Emoji char="🔗" />
                      : <Emoji char="✈️" />
                : t('messages.noMessages')
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/messages/${c.id}`)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-cloud-100 px-4 py-3 text-left transition-colors dark:border-navy-700/60',
                    active ? 'bg-sky/10' : 'hover:bg-cloud-50 dark:hover:bg-navy-700/50',
                  )}
                >
                  {c.type === 'group' || c.type === 'community' ? (
                    <span className="relative inline-flex">
                      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-navy-500">
                        <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                      </span>
                    </span>
                  ) : (
                    <UserAvatar user={other} size="md" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{c.name ?? other?.displayName}</span>
                      {last && <span className="shrink-0 text-[11px] text-cloud-500">{timeAgo(last.createdAt, lang)}</span>}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-cloud-500">{label}</span>
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky px-1.5 text-[10px] font-bold text-navy-900">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* thread */}
        <div className={cn('flex min-h-0 flex-col', !conversation && 'hidden sm:flex')}>
          {!conversation ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState icon={<Users className="h-8 w-8" />} title={t('messages.pickConversation')} body={t('messages.emptyHint')} />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-cloud-200 px-4 py-3 dark:border-navy-700">
                <button onClick={() => navigate('/messages')} className="rounded-lg p-1.5 text-cloud-500 hover:bg-cloud-100 sm:hidden dark:hover:bg-navy-700" aria-label={t('common.back')}>
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {conversation.type === 'dm' ? (
                  <UserAvatar user={others[0]} size="sm" />
                ) : (
                  <img src={conversation.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {conversation.type === 'dm' ? (
                      <Link to={`/profile/${others[0]?.username}`} className="hover:underline">
                        {others[0]?.displayName}
                      </Link>
                    ) : (
                      conversation.name
                    )}
                  </p>
                  <p className="text-xs text-cloud-500">
                    {t(`messages.${conversation.type === 'dm' ? 'dm' : conversation.type === 'group' ? 'group' : 'communityChat'}`)}
                    {conversation.type !== 'dm' && ` · ${conversation.participantIds.length}`}
                  </p>
                </div>
                {conversation.type === 'community' && conversation.communityId && (
                  <Link to={`/communities/${state.communities.find((c) => c.id === conversation.communityId)?.slug}`}>
                    <Badge tone="sky">{state.communities.find((c) => c.id === conversation.communityId)?.name}</Badge>
                  </Link>
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {conversation.messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    mine={m.senderId === 'me' || m.senderId === me?.id}
                    senderName={(m.senderId === 'me' ? me?.displayName : getUser(m.senderId)?.displayName) ?? ''}
                    sender={m.senderId === 'me' ? me ?? undefined : getUser(m.senderId)}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              <form
                className="flex items-center gap-2 border-t border-cloud-200 p-3 dark:border-navy-700"
                onSubmit={(e) => {
                  e.preventDefault()
                  send()
                }}
              >
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => attach(e.target.files?.[0] ?? null)} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label={t('messages.attachImage')}
                  className="rounded-lg p-2 text-cloud-500 hover:bg-cloud-100 dark:hover:bg-navy-700"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t('messages.placeholder')}
                  className="h-10 flex-1 rounded-full border border-cloud-200 bg-cloud-100 px-4 text-sm outline-none focus:border-sky dark:border-navy-600 dark:bg-navy-900 dark:text-cloud-100"
                />
                <Button type="submit" size="sm" disabled={!text.trim()} className="rounded-full">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  mine,
  senderName,
  sender,
}: {
  message: Message
  mine: boolean
  senderName: string
  sender?: ReturnType<ReturnType<typeof useStore>['getUser']>
}) {
  const { t, lang } = useI18n()
  const { state } = useStore()

  let content: React.ReactNode = null
  if (message.kind === 'text') content = <p className="whitespace-pre-wrap break-words text-sm"><RichText text={message.text ?? ''} /></p>
  if (message.kind === 'image')
    content = (
      <div>
        <img src={message.image} alt="" className="max-h-72 rounded-lg" />
        {message.text && <p className="mt-1.5 text-sm">{message.text}</p>}
      </div>
    )
  if (message.kind === 'post') {
    const post = state.posts.find((p) => p.id === message.postId)
    content = (
      <Link to="/home" className="block rounded-lg border border-sky/40 bg-sky/10 p-3 text-sm hover:bg-sky/15">
        <span className="flex items-center gap-1 text-[11px] font-semibold uppercase text-sky-600 dark:text-sky"><Emoji char="🔗" /> {t('post.share')}</span>
        <p className="mt-1 line-clamp-3">{post?.text ?? message.text}</p>
      </Link>
    )
  }
  if (message.kind === 'aircraft') {
    const a = message.aircraftId ? aircraftMap[message.aircraftId] : undefined
    if (a)
      content = (
        <Link to={`/aircraft/${a.id}`} className="flex gap-2.5 rounded-lg border border-sky/40 bg-sky/10 p-2.5 hover:bg-sky/15">
          <img src={a.image} alt="" className="h-14 w-20 rounded object-cover" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{a.name}</span>
            <span className="block truncate text-xs opacity-70">{a.manufacturer} · {a.country}</span>
            <span className="mt-1 block text-[11px] font-semibold text-sky-600 dark:text-sky">{t('aircraft.viewAircraft')} →</span>
          </span>
        </Link>
      )
  }

  return (
    <div className={cn('flex gap-2', mine && 'flex-row-reverse')}>
      {!mine && <UserAvatar user={sender} size="xs" className="mt-1" />}
      <div className={cn('max-w-[78%] rounded-2xl px-3.5 py-2.5', mine ? 'bg-navy-800 text-cloud-100 dark:bg-sky dark:text-navy-900' : 'bg-cloud-100 text-navy-700 dark:bg-navy-700 dark:text-cloud-100')}>
        {!mine && <p className="mb-0.5 text-[11px] font-semibold opacity-70">{senderName}</p>}
        {content}
        <p className={cn('mt-1 text-right text-[10px] opacity-60')}>{timeAgo(message.createdAt, lang)}</p>
      </div>
    </div>
  )
}
