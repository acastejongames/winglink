import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * WingLink cloud backend (Supabase).
 *
 * The app runs in one of two modes:
 *  - cloud  — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set: accounts,
 *             posts, DMs and XP live in Postgres with RLS. Real social network.
 *  - local  — no env vars: the encrypted on-device vault (previous behaviour).
 *
 * The anon key is a *public* client key (designed to ship in browsers).
 * The database password and any service-role key must NEVER be committed.
 */
const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when Supabase env vars are configured — enables the real backend. */
export function isCloud(): boolean {
  return Boolean(envUrl && envKey && envUrl.startsWith('http') && envKey.length > 20)
}

let client: SupabaseClient | null = null

export function sb(): SupabaseClient {
  if (!isCloud) throw new Error('Supabase is not configured')
  if (!client) {
    client = createClient(envUrl!, envKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  }
  return client
}

/** Upload a data-URL/remote image to the public `media` bucket; returns its public URL. */
export async function uploadMedia(dataUrl: string, ownerId: string): Promise<string> {
  if (!isCloud) return dataUrl
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const ext = blob.type.includes('png') ? 'png' : 'jpg'
  const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
  const { error } = await sb().storage.from('media').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  const { data } = sb().storage.from('media').getPublicUrl(path)
  return data.publicUrl
}

/** Replace every data: image in a post draft with a Storage URL (cloud mode). */
export async function hostImages(images: string[] | undefined, ownerId: string): Promise<string[] | undefined> {
  if (!images?.length) return images
  const hosted = await Promise.all(
    images.map(async (img) => (img.startsWith('data:') ? uploadMedia(img, ownerId) : img)),
  )
  return hosted
}
