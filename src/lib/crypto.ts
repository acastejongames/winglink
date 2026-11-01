/**
 * On-device vault encryption.
 *
 * Passwords are never stored. A random salt + PBKDF2-SHA256 (600k iterations)
 * derives a non-extractable key-encryption key (KEK) that only exists in
 * memory while unlocked. A random data-encryption key (DEK) encrypts
 * everything private (AES-256-GCM) and is itself stored only wrapped under
 * the KEK — so the persisted vault is unreadable without the password.
 */

export const VAULT_VERSION = 3
const PBKDF2_ITERATIONS = 600_000
const TOKEN = 'winglink-vault-v1'

export interface Sealed {
  iv: string
  ct: string
}

export interface VaultAccount {
  id: string
  username: string
  salt: string
  verifier: Sealed
  wrappedDEK: Sealed
  createdAt: string
}

export interface VaultStore {
  version: number
  accounts: VaultAccount[]
  payloads: Record<string, Sealed>
}

export const EMPTY_VAULT: VaultStore = { version: VAULT_VERSION, accounts: [], payloads: {} }

const enc = new TextEncoder()
const dec = new TextDecoder()

export function toB64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKek(password: string, saltB64: string, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(saltB64), iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable: the KEK cannot leave the browser
    ['encrypt', 'decrypt'],
  )
}

async function seal(key: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return { iv: toB64(iv), ct: toB64(new Uint8Array(ct)) }
}

async function unseal(key: CryptoKey, sealed: Sealed): Promise<Uint8Array<ArrayBuffer>> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(sealed.iv) }, key, fromB64(sealed.ct))
  return new Uint8Array(pt)
}

/** Create a fresh account record + DEK. The password is used only to derive keys — never stored. */
export async function createAccount(
  id: string,
  username: string,
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<{ account: VaultAccount; dek: CryptoKey }> {
  const salt = toB64(crypto.getRandomValues(new Uint8Array(16)))
  const kek = await deriveKek(password, salt, iterations)
  const dekBytes = crypto.getRandomValues(new Uint8Array(32))
  const dek = await crypto.subtle.importKey('raw', dekBytes, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
  return {
    account: {
      id,
      username,
      salt,
      verifier: await seal(kek, enc.encode(TOKEN)),
      wrappedDEK: await seal(kek, dekBytes),
      createdAt: new Date().toISOString(),
    },
    dek,
  }
}

/** Verify a password against an account and unwrap its DEK. Returns null when wrong. */
export async function unlockAccount(
  account: VaultAccount,
  password: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey | null> {
  try {
    const kek = await deriveKek(password, account.salt, iterations)
    const token = await unseal(kek, account.verifier)
    if (dec.decode(token) !== TOKEN) return null
    const dekBytes = await unseal(kek, account.wrappedDEK)
    return crypto.subtle.importKey('raw', dekBytes, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
  } catch {
    return null
  }
}

/** Import a raw DEK (base64) stored inside the per-tab session. */
export function importDek(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromB64(b64), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

/** Export the DEK for per-tab session continuity (cleared when the tab closes). */
export async function exportDek(dek: CryptoKey): Promise<string> {
  return toB64(new Uint8Array(await crypto.subtle.exportKey('raw', dek)))
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<Sealed> {
  return seal(key, enc.encode(JSON.stringify(value)))
}

export async function decryptJson<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  return JSON.parse(dec.decode(await unseal(key, sealed))) as T
}
