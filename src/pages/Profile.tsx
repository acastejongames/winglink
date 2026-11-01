import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Award, CalendarDays, Camera, Check, Flag, FolderPlus, Globe2, Heart, Lock, MessageSquare,
  MoreHorizontal, Pencil, Plane, Share2, ShieldBan, Trash2, UserCheck, UserPlus, Users, X,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/Toast'
import { PostCard } from '@/components/feed/PostCard'
import { UserAvatar } from '@/components/UserAvatar'
import { Badge, Button, Card, EmptyState, Modal, Spinner, Tabs, Textarea, Input, Select, AvatarFrame } from '@/components/ui/Primitives'
import { BlockModal, ReportModal, Lightbox, ShareModal } from '@/components/modals'
import { aircraftMap } from '@/lib/demo/aircraft'
import { BADGE_MAP, RANK_NAMES, rankForLevel } from '@/lib/gamification'
import { appUrl, cn, copyText, formatCount, levelProgress, timeAgo } from '@/lib/utils'

export default function Profile() {
  const { username } = useParams<{ username: string }>()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const {
    state, me, isFollowing, toggleFollow, isFriend, sendFriendRequest, removeFriend,
    ensureConversationWith, updateProfile, blockUser, unblockUser, getUserByUsername,
    removeFromCollection,
  } = useStore()
  const { toast } = useToast()
  const [tab, setTab] = useState('posts')
  const [editOpen, setEditOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const isMe = username === 'me' || (me && username === me.username)
  const user = isMe ? me : getUserByUsername(username ?? '')

  const posts = useMemo(
    () => (user ? state.posts.filter((p) => p.authorId === user.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) : []),
    [state.posts, user],
  )
  const media = useMemo(() => posts.flatMap((p) => (p.images ?? []).map((img) => ({ img, post: p }))), [posts])
  const blocked = user ? state.blocked.includes(user.id) : false
  const privateLocked = user?.visibility === 'private' && !isMe && !isFollowing(user.id)

  if (!user) {
    return (
      <div className="py-16">
        <EmptyState title={t('error.notFound')} body={`@${username}`} action={<Button onClick={() => navigate('/home')}>{t('nav.home')}</Button>} />
      </div>
    )
  }

  const level = Math.floor(Math.sqrt(user.xp / 120)) + 1
  const rank = rankForLevel(level)
  const prog = levelProgress(user.xp)
  const followingMe = user.id === me?.id ? false : state.following.includes(user.id) // whether I follow them
  const isSelf = me?.id === user.id

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* header card */}
      <Card className="overflow-hidden">
        <div className="relative h-44 sm:h-56">
          <img src={user.cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent" />
        </div>
        <div className="relative px-5 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="-mt-14 flex items-end gap-4">
              <AvatarFrame frame={user.frame} className="bg-white dark:bg-navy-800">
                <UserAvatar user={user} size="xl" ring={false} className="border-4 border-white dark:border-navy-800" />
              </AvatarFrame>
              <div className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold">{user.displayName}</h1>
                  {user.isDemo && <Badge tone="demo">{t('app.demoBadge')}</Badge>}
                  {user.visibility === 'private' && (
                    <Badge tone="amber">
                      <Lock className="h-3 w-3" /> {t('common.private')}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-cloud-500">
                  @{user.username} {user.country && `· ${user.country}`} {user.city && `· ${user.city}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pb-2">
              {isSelf ? (
                <Button onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" /> {t('profile.edit')}
                </Button>
              ) : (
                <>
                  <Button variant={followingMe ? 'outline' : 'primary'} onClick={() => toggleFollow(user.id)}>
                    {followingMe ? t('common.following') : t('common.follow')}
                  </Button>
                  {!isFriend(user.id) && !state.outgoingRequests.includes(user.id) && (
                    <Button variant="outline" onClick={() => sendFriendRequest(user.id)}>
                      <UserPlus className="h-4 w-4" /> {t('common.addFriend')}
                    </Button>
                  )}
                  {state.outgoingRequests.includes(user.id) && (
                    <Button variant="outline" disabled>
                      <Check className="h-4 w-4" /> {t('profile.friendPending')}
                    </Button>
                  )}
                  {isFriend(user.id) && (
                    <Button variant="outline" onClick={() => removeFriend(user.id)}>
                      <UserCheck className="h-4 w-4" /> {t('common.friends')}
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      const convId = ensureConversationWith(user.id)
                      navigate(`/messages/${convId}`)
                    }}
                  >
                    <MessageSquare className="h-4 w-4" /> {t('common.message')}
                  </Button>
                  <div className="relative">
                    <Button variant="ghost" onClick={() => setMenuOpen((v) => !v)} aria-label="More">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                    {menuOpen && (
                      <div className="absolute right-0 top-11 z-30 w-56 animate-scale-in overflow-hidden rounded-xl border border-cloud-200 bg-white py-1.5 shadow-card-hover dark:border-navy-600 dark:bg-navy-900">
                        <MenuItem
                          icon={<Share2 className="h-4 w-4" />}
                          label={t('profile.shareProfile')}
                          onClick={() => {
                            copyText(appUrl(`profile/${user.username}`))
                            toast(t('common.linkCopied'))
                            setMenuOpen(false)
                          }}
                        />
                        <MenuItem
                          icon={<Flag className="h-4 w-4" />}
                          label={t('common.report')}
                          onClick={() => { setReportOpen(true); setMenuOpen(false) }}
                        />
                        <MenuItem
                          icon={<ShieldBan className="h-4 w-4" />}
                          label={t('common.block')}
                          danger
                          onClick={() => { setBlockOpen(true); setMenuOpen(false) }}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* bio + tags */}
          {!privateLocked && (
            <>
              {user.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-navy-700 dark:text-cloud-200">{user.bio}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user.identityTags.map((tag) => (
                  <Badge key={tag} tone="sky">{tag}</Badge>
                ))}
                {user.interests.map((i) => (
                  <Badge key={i}>{i}</Badge>
                ))}
              </div>
            </>
          )}

          {/* stats */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Stat label={t('profile.statPosts')} value={formatCount(user.postsCount, lang)} />
            <Stat label={t('profile.followers')} value={formatCount(user.followers, lang)} />
            <Stat label={t('profile.following')} value={formatCount(user.following, lang)} />
            <Stat label={t('common.friends')} value={formatCount(user.friends, lang)} />
            <span className="flex items-center gap-1.5 text-cloud-500">
              <CalendarDays className="h-4 w-4" />
              {t('profile.joined', { date: timeAgo(user.joinedAt, lang) })}
            </span>
          </div>

          {/* XP bar */}
          <div className="mt-4 rounded-xl bg-gradient-to-r from-navy-700 to-navy-800 p-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-display font-semibold">
                <Award className="h-4 w-4 text-sky" />
                {t('profile.level', { n: level })} · {rank.icon} {RANK_NAMES[rank.id][lang]}
              </span>
              <span className="text-xs text-cloud-300">
                {t('profile.xpToNext', { n: prog.into, level: prog.level + 1 })}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-950/60">
              <div className="h-full rounded-full bg-gradient-to-r from-sky to-sky-400 transition-all" style={{ width: `${prog.pct}%` }} />
            </div>
            <div className="mt-2 flex gap-1">
              {user.badges.slice(0, 10).map((b) => (
                <span key={b} title={lang === 'es' ? BADGE_MAP[b]?.descEs : BADGE_MAP[b]?.desc} className="text-base">
                  {BADGE_MAP[b]?.icon ?? '🏅'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {blocked ? (
        <EmptyState
          icon={<ShieldBan className="h-8 w-8" />}
          title={t('profile.blocked', { name: user.displayName })}
          action={<Button onClick={() => unblockUser(user.id)}>{t('profile.unblockCta')}</Button>}
        />
      ) : privateLocked ? (
        <EmptyState
          icon={<Lock className="h-8 w-8" />}
          title={t('profile.privateTitle')}
          body={t('profile.privateBody', { name: user.displayName })}
          action={<Button onClick={() => toggleFollow(user.id)}>{t('common.follow')}</Button>}
        />
      ) : (
        <>
          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'posts', label: t('profile.posts'), count: posts.length },
              { id: 'media', label: t('profile.media'), count: media.length },
              { id: 'collections', label: t('profile.collections') },
              { id: 'achievements', label: t('profile.achievements'), count: user.badges.length },
              { id: 'about', label: t('profile.about') },
            ]}
          />

          {tab === 'posts' && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <EmptyState title={t('profile.noPosts')} body={t('profile.noPostsBody', { name: user.displayName })} />
              ) : (
                posts.map((p) => <PostCard key={p.id} post={p} showCommunity />)
              )}
            </div>
          )}

          {tab === 'media' && (
            media.length === 0 ? (
              <EmptyState icon={<Camera className="h-8 w-8" />} title={t('profile.noMedia')} />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {media.map((m, i) => (
                  <button key={i} onClick={() => setLightboxIdx(i)} className="group relative aspect-[4/3] overflow-hidden rounded-xl">
                    <img src={m.img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </button>
                ))}
              </div>
            )
          )}

          {tab === 'collections' && (
            <div className="space-y-6">
              <section>
                <h3 className="mb-3 font-display font-semibold">{t('profile.collectionsSaved')}</h3>
                {posts.filter((p) => p.savedByMe).length === 0 ? (
                  <EmptyState title={t('profile.noCollections')} body={t('post.save')} />
                ) : (
                  <div className="space-y-4">
                    {posts.filter((p) => p.savedByMe).map((p) => (
                      <PostCard key={p.id} post={p} showCommunity />
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h3 className="mb-3 font-display font-semibold">{t('profile.collectionsAircraft')}</h3>
                {state.collections.length === 0 ? (
                  <EmptyState icon={<Plane className="h-8 w-8" />} title={t('profile.noCollections')} action={<Button onClick={() => navigate('/aircraft')}>{t('aircraft.title')}</Button>} />
                ) : (
                  <div className="space-y-4">
                    {state.collections.map((col) => (
                      <Card key={col.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{col.name}</h4>
                            {col.visibility === 'private' && <Badge tone="amber"><Lock className="h-3 w-3" /> {t('common.private')}</Badge>}
                            <span className="text-xs text-cloud-500">{col.aircraftIds.length} aircraft</span>
                          </div>
                        </div>
                        {col.aircraftIds.length === 0 ? (
                          <p className="mt-2 text-sm text-cloud-500">{t('profile.noCollections')}</p>
                        ) : (
                          <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            {col.aircraftIds.map((aid) => {
                              const a = aircraftMap[aid]
                              if (!a) return null
                              return (
                                <div key={aid} className="group relative overflow-hidden rounded-xl">
                                  <Link to={`/aircraft/${a.id}`}>
                                    <img src={a.image} alt={a.name} loading="lazy" className="aspect-[16/10] w-full object-cover" />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 p-2 pt-6">
                                      <p className="truncate text-xs font-semibold text-white">{a.name}</p>
                                    </div>
                                  </Link>
                                  {isSelf && (
                                    <button
                                      onClick={() => removeFromCollection(col.id, aid)}
                                      aria-label={t('common.delete')}
                                      className="absolute right-1.5 top-1.5 rounded-full bg-navy-950/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === 'achievements' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat label={t('profile.statLikes')} value={formatCount(user.stats.likesReceived, lang)} icon={<Heart className="h-4 w-4" />} />
                <MiniStat label={t('profile.statComments')} value={formatCount(user.stats.comments, lang)} icon={<MessageSquare className="h-4 w-4" />} />
                <MiniStat label={t('profile.statQuizzes')} value={String(user.stats.quizzesPlayed)} icon={<Plane className="h-4 w-4" />} />
                <MiniStat label={t('profile.statBest')} value={String(user.stats.quizBestScore)} icon={<Award className="h-4 w-4" />} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {user.badges.length === 0 ? (
                  <EmptyState title={t('profile.noAchievements')} />
                ) : (
                  user.badges.map((b) => {
                    const def = BADGE_MAP[b]
                    if (!def) return null
                    return (
                      <Card key={b} className="flex items-start gap-3 p-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky/15 text-xl">{def.icon}</span>
                        <div>
                          <p className="text-sm font-semibold">{lang === 'es' ? def.nameEs : def.name}</p>
                          <p className="text-xs text-cloud-500">{lang === 'es' ? def.descEs : def.desc}</p>
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {tab === 'about' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-5">
                <h3 className="mb-3 font-display font-semibold">{t('profile.about')}</h3>
                <dl className="space-y-3 text-sm">
                  <AboutRow label={t('profile.country')} value={[user.country, user.city].filter(Boolean).join(' · ') || '—'} />
                  <AboutRow label={t('profile.interests')} value={user.interests.join(', ') || '—'} />
                  <AboutRow label={t('profile.identityTags')} value={user.identityTags.join(', ') || '—'} />
                  <AboutRow label={t('profile.joined', { date: '' })} value={timeAgo(user.joinedAt, lang)} />
                  <AboutRow label={t('settings.profileVisibility')} value={user.visibility === 'public' ? t('common.public') : t('common.private')} />
                </dl>
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-sky/10 p-3 text-xs text-sky-600 dark:text-sky">
                  <Globe2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('settings.protectedNote')}
                </p>
              </Card>
              <Card className="p-5">
                <h3 className="mb-3 font-display font-semibold">{t('profile.favoriteAircraft')}</h3>
                <div className="space-y-2">
                  {user.favoriteAircraft.length === 0 && <p className="text-sm text-cloud-500">—</p>}
                  {user.favoriteAircraft.map((name) => {
                    const a = Object.values(aircraftMap).find((x) => x.name === name || name.includes(x.name))
                    return a ? (
                      <Link key={name} to={`/aircraft/${a.id}`} className="flex items-center gap-3 rounded-xl border border-cloud-200 p-2.5 hover:border-sky dark:border-navy-600">
                        <img src={a.image} alt="" className="h-10 w-14 rounded-lg object-cover" loading="lazy" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{a.name}</span>
                          <span className="block truncate text-xs text-cloud-500">{a.manufacturer}</span>
                        </span>
                      </Link>
                    ) : (
                      <p key={name} className="rounded-xl border border-cloud-200 px-3 py-2.5 text-sm dark:border-navy-600">{name}</p>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
      <BlockModal open={blockOpen} onClose={() => setBlockOpen(false)} user={{ id: user.id, displayName: user.displayName }} />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={user.id} />
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} title={user.displayName} url={appUrl(`profile/${user.username}`)} />
      {lightboxIdx !== null && media.length > 0 && (
        <Lightbox
          images={media.map((m) => m.img)}
          index={Math.min(lightboxIdx, media.length - 1)}
          onClose={() => setLightboxIdx(null)}
          onIndex={setLightboxIdx}
        />
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-cloud-50 dark:hover:bg-navy-800',
        danger ? 'text-red-500' : 'text-navy-700 dark:text-cloud-200',
      )}
    >
      {icon} {label}
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <strong className="font-display">{value}</strong>
      <span className="text-cloud-500">{label}</span>
    </span>
  )
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="p-4 text-center">
      <span className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-sky/15 text-sky-600 dark:text-sky">{icon}</span>
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] text-cloud-500">{label}</p>
    </Card>
  )
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-cloud-500">{label.replace(/:$/, '')}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n()
  const { me, updateProfile } = useStore()
  const [displayName, setDisplayName] = useState(me?.displayName ?? '')
  const [bio, setBio] = useState(me?.bio ?? '')
  const [country, setCountry] = useState(me?.country ?? '')
  const [city, setCity] = useState(me?.city ?? '')
  const [visibility, setVisibility] = useState(me?.visibility ?? 'public')
  const [interests, setInterests] = useState((me?.interests ?? []).join(', '))
  const [tags, setTags] = useState((me?.identityTags ?? []).join(', '))
  const [favorites, setFavorites] = useState((me?.favoriteAircraft ?? []).join(', '))
  const [avatar, setAvatar] = useState(me?.avatar ?? '')
  const [cover, setCover] = useState(me?.cover ?? '')

  if (!me) return null
  const avatarOptions = ['images/f22-sky.jpg', 'images/f35-blue.jpg', 'images/concorde-sunset.jpg', 'images/gripen.jpg', 'images/b787.jpg', me.avatar]
  const coverOptions = ['images/f22-sunset.jpg', 'images/a350.jpg', 'images/cockpit-airliner.jpg', 'images/spitfire.jpg', 'images/b2-moon.jpg', 'images/chinook.jpg', me.cover]

  return (
    <Modal open={open} onClose={onClose} title={t('profile.editTitle')} wide>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-cloud-600 dark:text-cloud-300">{t('communities.avatarField')}</p>
          <div className="flex flex-wrap gap-2">
            {avatarOptions.map((img) => (
              <button key={img} onClick={() => setAvatar(img)} className={cn('h-12 w-12 overflow-hidden rounded-full ring-offset-2', avatar === img && 'ring-2 ring-sky')}>
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-cloud-600 dark:text-cloud-300">{t('communities.bannerField')}</p>
          <div className="flex flex-wrap gap-2">
            {coverOptions.map((img) => (
              <button key={img} onClick={() => setCover(img)} className={cn('h-12 w-20 overflow-hidden rounded-lg ring-offset-2', cover === img && 'ring-2 ring-sky')}>
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <Input label={t('auth.displayName')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <Textarea label={t('profile.about')} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('profile.country')} value={country} onChange={(e) => setCountry(e.target.value)} />
          <Input label={lang === 'es' ? 'Ciudad' : 'City'} value={city} onChange={(e) => setCity(e.target.value)} hint={t('settings.protectedNote')} />
        </div>
        <Input label={t('profile.interests')} value={interests} onChange={(e) => setInterests(e.target.value)} hint="Spotting, Flight simulation, …" />
        <Input label={t('profile.identityTags')} value={tags} onChange={(e) => setTags(e.target.value)} />
        <Input label={t('profile.favoriteAircraft')} value={favorites} onChange={(e) => setFavorites(e.target.value)} />
        <Select label={t('settings.profileVisibility')} value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}>
          <option value="public">{t('settings.profileVisibilityPublic')}</option>
          <option value="private">{t('settings.profileVisibilityPrivate')}</option>
        </Select>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            onClick={() => {
              updateProfile({
                displayName: displayName.trim() || me.username,
                bio: bio.trim(),
                country: country.trim(),
                city: city.trim(),
                visibility,
                interests: interests.split(',').map((s) => s.trim()).filter(Boolean),
                identityTags: tags.split(',').map((s) => s.trim()).filter(Boolean),
                favoriteAircraft: favorites.split(',').map((s) => s.trim()).filter(Boolean),
                avatar,
                cover,
              })
              onClose()
            }}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
