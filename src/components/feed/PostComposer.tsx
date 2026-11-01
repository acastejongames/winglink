import { useRef, useState } from 'react'
import { BarChart3, Image as ImageIcon, HelpCircle, Smile, Users, Video, X } from 'lucide-react'
import type { Post, PollOption } from '@/lib/types'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { useToast } from '../ui/Toast'
import { UserAvatar } from '../UserAvatar'
import { Button } from '../ui/Primitives'
import { cn, fileToCompressedDataUrl, uid } from '@/lib/utils'
import { topHashtags } from '@/lib/content/trending'

const MAX_LEN = 1000

export function PostComposer({ communityId }: { communityId?: string }) {
  const { t, lang } = useI18n()
  const { me, addPost, state } = useStore()
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [video, setVideo] = useState<{ poster: string; duration: string } | undefined>()
  const [videoUrl, setVideoUrl] = useState<string | undefined>()
  const [videoName, setVideoName] = useState<string | undefined>()
  const [mode, setMode] = useState<'normal' | 'poll' | 'question'>('normal')
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public')
  const [busy, setBusy] = useState(false)
  const imageInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)

  if (!me) return null

  const hashtagsInText = (text.match(/#[\p{L}\p{N}_]+/gu) || []).map((m) => m.slice(1).toLowerCase())
  const suggestions = topHashtags(state.posts, 8)
    .filter((h) => !hashtagsInText.includes(h.tag.toLowerCase()))
    .slice(0, 4)

  const pickImages = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const arr = Array.from(files).slice(0, 4)
      const urls = await Promise.all(arr.map((f) => fileToCompressedDataUrl(f)))
      setImages((prev) => [...prev, ...urls].slice(0, 6))
    } catch {
      toast(t('composer.mediaTooBig'), 'info')
    } finally {
      setBusy(false)
    }
  }

  const pickVideo = (file: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setVideoName(file.name)
    // grab a poster frame via video element
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    v.src = url
    v.onloadeddata = () => {
      v.currentTime = Math.min(1, (v.duration || 2) / 3)
    }
    v.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 900
      canvas.height = Math.round((v.videoHeight / v.videoWidth) * 900) || 506
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        setVideo({ poster: canvas.toDataURL('image/jpeg', 0.7), duration: `${Math.round(v.duration || 0)}s` })
      }
    }
  }

  const canPost =
    (text.trim().length > 0 || images.length > 0 || video || (mode === 'poll' && pollOptions.filter((o) => o.trim()).length >= 2)) &&
    text.length <= MAX_LEN

  const submit = () => {
    if (!canPost) {
      toast(t('composer.empty'), 'info')
      return
    }
    let type: Post['type'] = 'text'
    let poll: Post['poll']
    if (mode === 'poll' && pollOptions.filter((o) => o.trim()).length >= 2) {
      type = 'poll'
      const opts: PollOption[] = pollOptions.filter((o) => o.trim()).map((o) => ({ id: uid('o'), text: o.trim(), votes: 0 }))
      poll = {
        question: pollQuestion.trim() || text.trim() || 'Poll',
        options: opts,
        endsAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
      }
    } else if (mode === 'question') {
      type = 'question'
    } else if (video) {
      type = 'video'
    } else if (images.length > 1) {
      type = 'carousel'
    } else if (images.length === 1) {
      type = 'image'
    }
    addPost({
      type,
      text,
      images: images.length ? images : undefined,
      video,
      poll,
      communityId,
      visibility,
    })
    setText('')
    setImages([])
    setVideo(undefined)
    setVideoUrl(undefined)
    setVideoName(undefined)
    setMode('normal')
    setPollQuestion('')
    setPollOptions(['', ''])
  }

  const hashtagButtons = suggestions.map((s) => s.tag)

  return (
    <div className="rounded-2xl border border-cloud-200 bg-white p-4 shadow-card dark:border-navy-700 dark:bg-navy-800">
      <div className="flex gap-3">
        <UserAvatar user={me} size="md" />
        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('composer.placeholder')}
            rows={text.length > 80 ? 4 : 2}
            className="w-full resize-none bg-transparent text-[15px] text-navy-700 outline-none placeholder:text-cloud-400 dark:text-cloud-100 dark:placeholder:text-cloud-500"
          />

          {/* media previews */}
          {(images.length > 0 || video) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative h-24 w-24 overflow-hidden rounded-xl">
                  <img src={img} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, x) => x !== i))}
                    aria-label={t('composer.removeMedia')}
                    className="absolute right-1 top-1 rounded-full bg-navy-950/70 p-1 text-white hover:bg-navy-950"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {video && (
                <div className="relative h-24 w-36 overflow-hidden rounded-xl bg-navy-900">
                  <video src={videoUrl} poster={video.poster} className="h-full w-full object-cover" controls />
                  <button
                    onClick={() => {
                      setVideo(undefined)
                      setVideoUrl(undefined)
                      setVideoName(undefined)
                    }}
                    aria-label={t('composer.removeMedia')}
                    className="absolute right-1 top-1 rounded-full bg-navy-950/70 p-1 text-white hover:bg-navy-950"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
          {videoName && !video && <p className="mt-1 text-xs text-cloud-500">{videoName}</p>}

          {/* poll builder */}
          {mode === 'poll' && (
            <div className="mt-3 space-y-2 rounded-xl border border-cloud-200 p-3 dark:border-navy-600">
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder={t('composer.pollQuestion')}
                className="h-9 w-full rounded-lg bg-transparent text-sm outline-none placeholder:text-cloud-400 dark:text-cloud-100"
              />
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => setPollOptions((prev) => prev.map((p, x) => (x === i ? e.target.value : p)))}
                    placeholder={t('composer.pollOption', { n: i + 1 })}
                    className="h-9 flex-1 rounded-lg border border-cloud-200 bg-cloud-50 px-3 text-sm outline-none focus:border-sky dark:border-navy-600 dark:bg-navy-900 dark:text-cloud-100"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => setPollOptions((prev) => prev.filter((_, x) => x !== i))} className="text-cloud-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button onClick={() => setPollOptions((prev) => [...prev, ''])} className="text-sm font-medium text-sky-600 hover:underline dark:text-sky">
                  + {t('composer.addOption')}
                </button>
              )}
            </div>
          )}

          {/* hashtag suggestions */}
          {text.trim().length > 0 && hashtagButtons.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-cloud-500">{t('composer.suggestedTags')}</span>
              {hashtagButtons.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setText((prev) => `${prev}#${tag} `)}
                  className="rounded-full bg-sky/10 px-2.5 py-1 text-xs font-medium text-sky-600 hover:bg-sky/20 dark:text-sky"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* toolbar */}
          <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-cloud-200 pt-3 dark:border-navy-700">
            <input ref={imageInput} type="file" accept="image/*" multiple hidden onChange={(e) => pickImages(e.target.files)} />
            <input ref={videoInput} type="file" accept="video/*" hidden onChange={(e) => pickVideo(e.target.files?.[0] ?? null)} />
            <ToolButton icon={<ImageIcon className="h-4.5 w-4.5 h-[18px] w-[18px]" />} label={t('composer.media')} onClick={() => imageInput.current?.click()} />
            <ToolButton
              icon={<Video className="h-[18px] w-[18px]" />}
              label={t('composer.video')}
              active={mode === 'normal' && !!video}
              onClick={() => videoInput.current?.click()}
            />
            <ToolButton
              icon={<BarChart3 className="h-[18px] w-[18px]" />}
              label={t('composer.poll')}
              active={mode === 'poll'}
              onClick={() => setMode((m) => (m === 'poll' ? 'normal' : 'poll'))}
            />
            <ToolButton
              icon={<HelpCircle className="h-[18px] w-[18px]" />}
              label={t('composer.question')}
              active={mode === 'question'}
              onClick={() => setMode((m) => (m === 'question' ? 'normal' : 'question'))}
            />
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-cloud-500">
                <Users className="h-3.5 w-3.5" />
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as 'public' | 'followers')}
                  className="bg-transparent text-xs font-medium text-cloud-600 outline-none dark:text-cloud-300"
                  aria-label={t('composer.visibility')}
                >
                  <option value="public">{t('composer.visibilityPublic')}</option>
                  <option value="followers">{t('composer.visibilityFollowers')}</option>
                </select>
              </label>
              {text.length > MAX_LEN - 100 && (
                <span className={cn('text-xs', text.length > MAX_LEN ? 'text-red-500' : 'text-cloud-500')}>
                  {text.length}/{MAX_LEN}
                </span>
              )}
              <Button onClick={submit} disabled={!canPost || busy} size="sm">
                {busy ? t('common.loading') : t('composer.publish')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolButton({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-sky/15 text-sky-600 dark:text-sky' : 'text-cloud-500 hover:bg-cloud-100 dark:hover:bg-navy-700',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
