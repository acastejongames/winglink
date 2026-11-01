import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, Compass, Lock, Plus, Search, Shield, Users } from 'lucide-react'
import type { Community } from '@/lib/types'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Tabs, Textarea } from '@/components/ui/Primitives'
import { UserAvatar } from '@/components/UserAvatar'
import { formatCount, levelFromXp } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

const CATEGORIES = ['Military', 'Commercial', 'Spotting', 'Simulation', 'History', 'Rotorcraft', 'General']

const PRESET_AVATARS = [
  'images/f22-sunset.jpg', 'images/a350.jpg', 'images/cockpit-fighter.jpg', 'images/spotting-fence.jpg',
  'images/spitfire.jpg', 'images/helicopters.jpg', 'images/concorde.jpg', 'images/cessna.jpg',
]
const PRESET_BANNERS = [
  'images/f16-afterburner.jpg', 'images/b747.webp', 'images/fa18-formation.jpg', 'images/b2-moon.jpg',
  'images/a350-winglet.jpg', 'images/chinook.jpg', 'images/concorde-1968.jpg', 'images/f35-blue.jpg',
]

export default function Communities() {
  const { t, lang } = useI18n()
  const { state, me, toggleJoinCommunity, createCommunity } = useStore()
  const { toast } = useToast()
  const [tab, setTab] = useState('browse')
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const level = me ? levelFromXp(me.xp) : 1
  const canCreate = level >= 5

  const mine = state.communities.filter((c) => c.joined)
  const query = q.trim().toLowerCase()
  const browse = state.communities.filter(
    (c) => !query || c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query) || c.category.toLowerCase().includes(query),
  )

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('communities.title')}</h1>
          <p className="mt-1 text-sm text-cloud-500">{t('communities.subtitle')}</p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t('communities.create')}
          </Button>
        ) : (
          <Button disabled title={t('communities.createLocked')}>
            <Lock className="h-4 w-4" /> {t('communities.create')}
          </Button>
        )}
      </div>
      {!canCreate && (
        <p className="flex items-center gap-2 rounded-xl bg-sky/10 px-4 py-2.5 text-xs text-sky-600 dark:text-sky">
          <Shield className="h-3.5 w-3.5" /> {t('communities.createRequirement')}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'browse', label: t('communities.browse'), count: browse.length },
            { id: 'mine', label: t('communities.mine'), count: mine.length },
          ]}
        />
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cloud-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('common.search')}
            className="h-10 w-full rounded-full border border-cloud-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-sky dark:border-navy-700 dark:bg-navy-800"
          />
        </div>
      </div>

      {(tab === 'mine' ? mine : browse).length === 0 ? (
        <EmptyState
          icon={<Compass className="h-8 w-8" />}
          title={tab === 'mine' ? t('home.emptyCommunities') : t('explore.noResults', { q })}
          action={
            tab === 'mine' ? (
              <Button onClick={() => setTab('browse')}>{t('communities.browse')}</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(tab === 'mine' ? mine : browse).map((c) => (
            <CommunityCard key={c.id} community={c} onToggle={() => toggleJoinCommunity(c.id)} />
          ))}
        </div>
      )}

      <CreateCommunityModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={(data) => {
        const id = createCommunity(data)
        setCreateOpen(false)
        return id
      }} />
    </div>
  )
}

function CommunityCard({ community, onToggle }: { community: Community; onToggle: () => void }) {
  const { t, lang } = useI18n()
  return (
    <Card hover className="overflow-hidden">
      <Link to={`/communities/${community.slug}`} className="relative block h-28">
        <img src={community.banner} alt="" loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 to-transparent" />
        <img src={community.avatar} alt="" className="absolute -bottom-5 left-4 h-14 w-14 rounded-xl border-2 border-white object-cover dark:border-navy-800" />
        {community.visibility === 'private' && (
          <Badge tone="amber" className="absolute right-3 top-3 backdrop-blur">
            <Lock className="h-3 w-3" /> {t('common.private')}
          </Badge>
        )}
      </Link>
      <div className="px-4 pb-4 pt-8">
        <Link to={`/communities/${community.slug}`}>
          <h3 className="font-display font-semibold hover:underline">{community.name}</h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-cloud-500">{community.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-cloud-500">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {t('communities.members', { n: formatCount(community.memberCount, lang) })}
            </span>
            <Badge>{community.category}</Badge>
          </div>
          <Button size="sm" variant={community.joined ? 'outline' : 'primary'} onClick={onToggle}>
            {community.joined ? (
              <>
                <Check className="h-3.5 w-3.5" /> {t('common.joined')}
              </>
            ) : community.pending ? (
              t('common.requested')
            ) : (
              t('common.join')
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}

function CreateCommunityModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (data: { name: string; description: string; category: string; visibility: 'public' | 'private'; rules: string[]; avatar: string; banner: string }) => string | null
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [rulesText, setRulesText] = useState('')
  const [avatar, setAvatar] = useState(PRESET_AVATARS[0])
  const [banner, setBanner] = useState(PRESET_BANNERS[0])
  const [error, setError] = useState('')

  const submit = () => {
    if (name.trim().length < 3 || name.trim().length > 40) {
      setError(t('communities.errName'))
      return
    }
    if (description.trim().length < 20) {
      setError(t('communities.errDesc'))
      return
    }
    onCreate({
      name: name.trim(),
      description: description.trim(),
      category,
      visibility,
      rules: rulesText.split('\n').map((r) => r.trim()).filter(Boolean),
      avatar,
      banner,
    })
    setName('')
    setDescription('')
    setRulesText('')
    setError('')
  }

  return (
    <Modal open={open} onClose={onClose} title={t('communities.createTitle')} wide>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-cloud-600 dark:text-cloud-300">{t('communities.avatarField')}</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_AVATARS.map((img) => (
              <button
                key={img}
                onClick={() => setAvatar(img)}
                className={`h-12 w-12 overflow-hidden rounded-xl ring-offset-2 transition-all ${avatar === img ? 'ring-2 ring-sky' : ''}`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-cloud-600 dark:text-cloud-300">{t('communities.bannerField')}</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_BANNERS.map((img) => (
              <button
                key={img}
                onClick={() => setBanner(img)}
                className={`h-12 w-20 overflow-hidden rounded-lg ring-offset-2 transition-all ${banner === img ? 'ring-2 ring-sky' : ''}`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <Input label={t('communities.name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <Textarea label={t('communities.description')} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t('communities.category')} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Select label={t('communities.visibilityField')} value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}>
            <option value="public">{t('common.public')}</option>
            <option value="private">{t('common.private')}</option>
          </Select>
        </div>
        <p className="text-xs text-cloud-500">{t('communities.privateHint')}</p>
        <Textarea label={t('communities.rulesField')} rows={4} value={rulesText} onChange={(e) => setRulesText(e.target.value)} />
        {error && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={submit}>{t('common.create')}</Button>
        </div>
      </div>
    </Modal>
  )
}
