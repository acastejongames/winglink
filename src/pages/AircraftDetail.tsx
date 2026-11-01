import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FolderPlus, Share2, Star } from 'lucide-react'
import { aircraftMap, aircraft as allAircraft, categoryLabels } from '@/lib/demo/aircraft'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { Badge, Button, Card, EmptyState, Modal, Select, Spinner } from '@/components/ui/Primitives'
import { ShareModal } from '@/components/modals'
import { appUrl, cn } from '@/lib/utils'

export default function AircraftDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const { state, toggleFavoriteAircraft, createCollection, addToCollection } = useStore()
  const [addToOpen, setAddToOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [newColOpen, setNewColOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColVis, setNewColVis] = useState<'public' | 'private'>('private')

  const aircraft = id ? aircraftMap[id] : undefined
  if (!aircraft) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyState title={t('error.notFound')} action={<Button onClick={() => navigate('/aircraft')}>{t('aircraft.title')}</Button>} />
      </div>
    )
  }

  const fav = state.favoriteAircraft.includes(aircraft.id)
  const related = aircraft.related.map((r) => aircraftMap[r]).filter(Boolean)
  const specEntries = Object.entries(aircraft.specs).filter(([k]) => k !== 'firstFlight' || aircraft.specs.firstFlight)
  const specLabels: Record<string, string> = {
    topSpeed: 'Top speed',
    range: 'Range',
    ceiling: 'Service ceiling',
    length: 'Length',
    wingspan: 'Wingspan',
    rotorDiameter: 'Rotor diameter',
    firstFlight: t('aircraft.firstFlight'),
    crew: 'Crew',
    engines: 'Engines',
    production: 'Production',
  }
  const specLabelsEs: Record<string, string> = {
    topSpeed: 'Velocidad máxima',
    range: 'Alcance',
    ceiling: 'Techo de vuelo',
    length: 'Longitud',
    wingspan: 'Envergadura',
    rotorDiameter: 'Diámetro del rotor',
    firstFlight: t('aircraft.firstFlight'),
    crew: 'Tripulación',
    engines: 'Motores',
    production: 'Producción',
  }
  const isEs = t('common.save') === 'Guardar'

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/aircraft" className="inline-flex items-center gap-1.5 text-sm text-cloud-500 hover:text-sky">
        <ArrowLeft className="h-4 w-4" /> {t('aircraft.title')}
      </Link>

      <Card className="overflow-hidden">
        <div className="relative aspect-[16/9] bg-navy-900">
          <img src={aircraft.image} alt={aircraft.name} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/90 via-navy-950/40 to-transparent p-6 pt-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Badge tone="sky" className="mb-2 backdrop-blur">{categoryLabels[aircraft.category]}</Badge>
                <h1 className="font-display text-3xl font-bold text-white">{aircraft.name}</h1>
                <p className="mt-1 text-sm text-cloud-300">
                  {aircraft.manufacturer} · {aircraft.country} · {t('aircraft.year')} {aircraft.year}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white" onClick={() => toggleFavoriteAircraft(aircraft.id)}>
                  <Star className={cn('h-4 w-4', fav && 'fill-current text-amber-400')} /> {fav ? t('aircraft.favorited') : t('aircraft.favorite')}
                </Button>
                <Button variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white" onClick={() => setAddToOpen(true)}>
                  <FolderPlus className="h-4 w-4" /> {t('aircraft.addToCollection')}
                </Button>
                <Button variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white" onClick={() => setShareOpen(true)}>
                  <Share2 className="h-4 w-4" /> {t('common.share')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <section>
              <h2 className="mb-2 font-display text-lg font-semibold">{t('aircraft.history')}</h2>
              <p className="text-sm leading-relaxed text-navy-700 dark:text-cloud-200">{aircraft.description}</p>
            </section>
            {aircraft.variants.length > 0 && (
              <section>
                <h2 className="mb-2 font-display text-lg font-semibold">{t('aircraft.variants')}</h2>
                <div className="flex flex-wrap gap-2">
                  {aircraft.variants.map((v) => (
                    <Badge key={v}>{v}</Badge>
                  ))}
                </div>
              </section>
            )}
          </div>
          <section>
            <h2 className="mb-2 font-display text-lg font-semibold">{t('aircraft.specs')}</h2>
            <dl className="divide-y divide-cloud-200 rounded-xl border border-cloud-200 dark:divide-navy-700 dark:border-navy-700">
              <div className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                <dt className="text-cloud-500">{t('aircraft.manufacturer')}</dt>
                <dd className="text-right font-medium">{aircraft.manufacturer}</dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                <dt className="text-cloud-500">{t('aircraft.country')}</dt>
                <dd className="text-right font-medium">{aircraft.country}</dd>
              </div>
              <div className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                <dt className="text-cloud-500">{t('aircraft.category')}</dt>
                <dd className="text-right font-medium">{categoryLabels[aircraft.category]}</dd>
              </div>
              {specEntries.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                  <dt className="text-cloud-500">{(isEs ? specLabelsEs : specLabels)[key] ?? key}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </Card>

      {related.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">{t('aircraft.related')}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((a) => (
              <Link key={a.id} to={`/aircraft/${a.id}`}>
                <Card hover className="overflow-hidden">
                  <img src={a.image} alt={a.name} loading="lazy" className="aspect-[16/10] w-full object-cover" />
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <p className="truncate text-xs text-cloud-500">{a.manufacturer}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* add to collection */}
      <Modal open={addToOpen} onClose={() => setAddToOpen(false)} title={t('aircraft.addToCollection')}>
        <div className="space-y-3">
          {state.collections.length === 0 && <p className="text-sm text-cloud-500">{t('profile.noCollections')}</p>}
          {state.collections.map((col) => {
            const has = col.aircraftIds.includes(aircraft.id)
            return (
              <button
                key={col.id}
                disabled={has}
                onClick={() => {
                  addToCollection(col.id, aircraft.id)
                  setAddToOpen(false)
                }}
                className="flex w-full items-center justify-between rounded-xl border border-cloud-200 px-4 py-3 text-left text-sm hover:border-sky disabled:opacity-50 dark:border-navy-600"
              >
                <span>
                  <span className="font-semibold">{col.name}</span>
                  {col.visibility === 'private' && <Badge tone="amber" className="ml-2">{t('common.private')}</Badge>}
                </span>
                <span className="text-xs text-cloud-500">{has ? '✓' : col.aircraftIds.length}</span>
              </button>
            )
          })}
          <Button variant="outline" className="w-full" onClick={() => { setAddToOpen(false); setNewColOpen(true) }}>
            <FolderPlus className="h-4 w-4" /> {t('aircraft.newCollection')}
          </Button>
        </div>
      </Modal>

      <Modal open={newColOpen} onClose={() => setNewColOpen(false)} title={t('aircraft.newCollection')}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-cloud-600 dark:text-cloud-300">{t('aircraft.collectionName')}</span>
            <input
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="h-11 w-full rounded-xl border border-cloud-200 bg-cloud-50 px-3.5 text-sm outline-none focus:border-sky dark:border-navy-600 dark:bg-navy-900 dark:text-cloud-100"
            />
          </label>
          <Select label={t('aircraft.collectionVisibility')} value={newColVis} onChange={(e) => setNewColVis(e.target.value as 'public' | 'private')}>
            <option value="public">{t('common.public')}</option>
            <option value="private">{t('common.private')}</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNewColOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                if (newColName.trim().length < 2) return
                const colId = createCollection(newColName.trim(), newColVis)
                addToCollection(colId, aircraft.id)
                setNewColName('')
                setNewColOpen(false)
              }}
            >
              {t('common.create')}
            </Button>
          </div>
        </div>
      </Modal>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={aircraft.name}
        url={appUrl(`aircraft/${aircraft.id}`)}
        aircraftId={aircraft.id}
      />
    </div>
  )
}
