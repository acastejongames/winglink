import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Flag, ShieldBan, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Modal, Textarea, Select } from './ui/Primitives'
import { UserAvatar } from './UserAvatar'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { useToast } from './ui/Toast'
import { copyText } from '@/lib/utils'

export function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
}: {
  open: boolean
  onClose: () => void
  targetType: 'post' | 'user' | 'community'
  targetId: string
}) {
  const { t } = useI18n()
  const { report } = useStore()
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  return (
    <Modal open={open} onClose={onClose} title={t('report.title')}>
      <div className="space-y-4">
        <Select label={t('report.reason')} value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="spam">{t('report.reasonSpam')}</option>
          <option value="harassment">{t('report.reasonHarassment')}</option>
          <option value="unsafe">{t('report.reasonUnsafe')}</option>
          <option value="copyright">{t('report.reasonCopyright')}</option>
          <option value="other">{t('report.reasonOther')}</option>
        </Select>
        <Textarea label={t('report.details')} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              report(targetType, targetId, reason, details || undefined)
              onClose()
            }}
          >
            <Flag className="h-4 w-4" />
            {t('report.submit')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function BlockModal({
  open,
  onClose,
  user,
}: {
  open: boolean
  onClose: () => void
  user: { id: string; displayName: string }
}) {
  const { t } = useI18n()
  const { blockUser } = useStore()
  const { toast } = useToast()
  return (
    <Modal open={open} onClose={onClose} title={t('block.title')}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
          <ShieldBan className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t('block.body')}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              blockUser(user.id)
              toast(t('common.block') + ' ✓')
              onClose()
            }}
          >
            {t('block.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function ShareModal({
  open,
  onClose,
  title,
  url,
  postId,
  aircraftId,
}: {
  open: boolean
  onClose: () => void
  title: string
  url: string
  postId?: string
  aircraftId?: string
}) {
  const { t } = useI18n()
  const { state, sendMessage } = useStore()
  const { toast } = useToast()
  const [pick, setPick] = useState(false)
  const shareable = state.conversations
  return (
    <Modal open={open} onClose={onClose} title={t('common.share')}>
      {!pick ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-cloud-200 bg-cloud-50 p-3 text-sm text-cloud-600 dark:border-navy-600 dark:bg-navy-900/60 dark:text-cloud-300">
            {title}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                copyText(url)
                  .then(() => toast(t('common.linkCopied')))
                  .catch(() => toast(t('error.generic'), 'info'))
                onClose()
              }}
            >
              {t('post.copyLink')}
            </Button>
            <Button variant="outline" onClick={() => setPick(true)}>
              {t('post.shareToMessage')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-cloud-500 dark:text-cloud-400">{t('messages.pickConversation')}</p>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {shareable.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  sendMessage(c.id, {
                    kind: postId ? 'post' : 'aircraft',
                    postId,
                    aircraftId,
                    text: title,
                  })
                  toast(t('common.share') + ' ✓')
                  onClose()
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-cloud-100 dark:hover:bg-navy-700"
              >
                <UserAvatar user={state.users.find((u) => u.id === c.participantIds.find((p) => p !== 'me'))} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-navy-800 dark:text-cloud-100">
                    {c.name ?? state.users.find((u) => u.id === c.participantIds[0])?.displayName ?? 'Conversation'}
                  </span>
                  <span className="text-xs text-cloud-500">{t(`messages.${c.type === 'dm' ? 'dm' : c.type === 'group' ? 'group' : 'communityChat'}`)}</span>
                </span>
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setPick(false)} className="w-full">
            {t('common.back')}
          </Button>
        </div>
      )}
    </Modal>
  )
}

export function Lightbox({
  images,
  index,
  onClose,
  onIndex,
  caption,
  footer,
}: {
  images: string[]
  index: number
  onClose: () => void
  onIndex: (i: number) => void
  caption?: ReactNode
  footer?: ReactNode
}) {
  const { t } = useI18n()
  if (!images.length) return null
  const prev = () => onIndex((index - 1 + images.length) % images.length)
  const next = () => onIndex((index + 1) % images.length)
  return (
    <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-navy-950/95 p-4 animate-fade-in" onClick={onClose}>
      <button onClick={onClose} aria-label={t('common.close')} className="absolute right-4 top-4 rounded-full p-2 text-cloud-300 hover:bg-white/10">
        <X className="h-6 w-6" />
      </button>
      <div className="relative flex max-h-[75vh] items-center" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && (
          <button
            onClick={prev}
            aria-label="Previous"
            className="absolute -left-12 hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <img src={images[index]} alt="" className="max-h-[75vh] max-w-[90vw] rounded-xl object-contain" />
        {images.length > 1 && (
          <button
            onClick={next}
            aria-label="Next"
            className="absolute -right-12 hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => onIndex(i)}
              aria-label={`Image ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-sky' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}
      {(caption || footer) && (
        <div className="mt-4 max-w-2xl text-center text-sm text-cloud-200" onClick={(e) => e.stopPropagation()}>
          {caption}
          {footer}
        </div>
      )}
    </div>
  )
}

export function ProfileLink({ username, children, className }: { username: string; children: ReactNode; className?: string }) {
  return (
    <Link to={`/profile/${username}`} className={className}>
      {children}
    </Link>
  )
}
