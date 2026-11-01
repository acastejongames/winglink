import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, FolderPlus, Plane, Search, Star } from 'lucide-react'
import { aircraft, categoryLabels } from '@/lib/demo/aircraft'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { Badge, Button, Card, EmptyState, Modal, Select } from '@/components/ui/Primitives'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

const CATEGORY_FILTERS = [
  'all', 'fighter', 'bomber', 'commercial', 'helicopter', 'historical',
  'general-aviation', 'experimental', 'uav',
] as const

export default function AircraftPage() {
  const { t } = useI18n()
  const { state, me, createCollection, toggleFavoriteAircraft } = useStore()
  const { toast } = useToast()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('all')
  const [newColOpen, setNewColOpen] = useState(false)
  const [colName, setColName] = useState('')
  const [colVisibility, setColVisibility] = useState<'public' | 'private'>('private')

  const query = q.trim().toLowerCase()
  const list = useMemo(
    () =>
      aircraft.filter((a) => {
        const matchesQ =
          !query ||
          a.name.toLowerCase().includes(query) ||
          a.manufacturer.toLowerCase().includes(query) ||
          a.country.toLowerCase().includes(query)
        const matchesCat = cat === 'all' || a.category === cat
        return matchesQ && matchesCat
      }),
    [query, cat],
  )

  const createCol = () => {
    if (colName.trim().length < 2) return
    createCollection(colName.trim(), colVisibility)
    setColName('')
    setNewColOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Plane className="h-6 w-6 text-sky" /> {t('aircraft.title')}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-cloud-500">{t('aircraft.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => setNewColOpen(true)}>
          <FolderPlus className="h-4 w-4" /> {t('aircraft.newCollection')}
        </Button>
      </div>

      {/* collections strip */}
      {state.collections.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {state.collections.map((col) => (
            <div key={col.id} className="w-56 shrink-0 rounded-xl border border-cloud-200 bg-white p-3 shadow-card dark:border-navy-700 dark:bg-navy-800">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-amber-400" />
                <p className="truncate text-sm font-semibold">{col.name}</p>
                {col.visibility === 'private' && <Badge tone="amber">{t('common.private')}</Badge>}
              </div>
              <p className="mt-1 text-xs text-cloud-500">
                {col.aircraftIds.length} {t('aircraft.title').toLowerCase()}
              </p>
              <div className="mt-2 flex -space-x-2">
                {col.aircraftIds.slice(0, 4).map((id) => {
                  const a = aircraft.find((x) => x.id === id)
                  return a ? <img key={id} src={a.image} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover dark:border-navy-800" /> : null
                })}
                {col.aircraftIds.length === 0 && <span className="text-[11px] text-cloud-400">—</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* search + filters */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cloud-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('aircraft.searchPlaceholder')}
          className="h-12 w-full rounded-2xl border border-cloud-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-sky dark:border-navy-700 dark:bg-navy-800"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              cat === c
                ? 'bg-navy-800 text-sky dark:bg-navy-700'
                : 'bg-white text-cloud-600 hover:bg-cloud-200 dark:bg-navy-800 dark:text-cloud-300 dark:hover:bg-navy-700',
            )}
          >
            {c === 'all' ? t('common.all') : categoryLabels[c]}
          </button>
        ))}
      </div>

      <p className="text-xs text-cloud-500">{t('aircraft.showing', { n: list.length })}</p>

      {list.length === 0 ? (
        <EmptyState icon={<Plane className="h-8 w-8" />} title={t('aircraft.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => {
            const fav = state.favoriteAircraft.includes(a.id)
            return (
              <Card key={a.id} hover className="group overflow-hidden">
                <Link to={`/aircraft/${a.id}`} className="relative block aspect-[16/10]">
                  <img src={a.image} alt={a.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute left-3 top-3">
                    <Badge tone="sky" className="backdrop-blur">{categoryLabels[a.category]}</Badge>
                  </span>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/aircraft/${a.id}`}>
                        <h3 className="truncate font-display font-semibold hover:underline">{a.name}</h3>
                      </Link>
                      <p className="truncate text-xs text-cloud-500">{a.manufacturer} · {a.country} · {a.year}</p>
                    </div>
                    <button
                      onClick={() => toggleFavoriteAircraft(a.id)}
                      aria-label={t('aircraft.favorite')}
                      className={cn('rounded-lg p-1.5 hover:bg-cloud-100 dark:hover:bg-navy-700', fav ? 'text-amber-400' : 'text-cloud-400')}
                    >
                      <Star className={cn('h-4.5 w-4.5 h-[18px] w-[18px]', fav && 'fill-current')} />
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-cloud-500">{a.description}</p>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={newColOpen} onClose={() => setNewColOpen(false)} title={t('aircraft.newCollection')}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-cloud-600 dark:text-cloud-300">{t('aircraft.collectionName')}</span>
            <input
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              className="h-11 w-full rounded-xl border border-cloud-200 bg-cloud-50 px-3.5 text-sm outline-none focus:border-sky dark:border-navy-600 dark:bg-navy-900 dark:text-cloud-100"
            />
          </label>
          <Select label={t('aircraft.collectionVisibility')} value={colVisibility} onChange={(e) => setColVisibility(e.target.value as 'public' | 'private')}>
            <option value="public">{t('common.public')}</option>
            <option value="private">{t('common.private')}</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewColOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={createCol}>{t('common.create')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
