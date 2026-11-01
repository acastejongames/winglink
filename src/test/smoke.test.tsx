// Runtime smoke test: renders every route of the app inside the full provider
// stack and asserts that each one mounts without throwing and shows its content.
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { I18nProvider } from '../lib/i18n'
import { StoreProvider } from '../lib/store'
import { ToastProvider } from '../components/ui/Toast'
import { createAccount, encryptJson, exportDek } from '../lib/crypto'

const VAULT_KEY = 'winglink.vault.v3'
const SESSION_KEY = 'winglink.session.v3'
// Low iteration count keeps tests fast; production uses 600,000.
const TEST_ITERATIONS = 1_000

// jsdom shims used by the app
beforeAll(() => {
  ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  Element.prototype.scrollIntoView = () => {}
  window.matchMedia =
    window.matchMedia ||
    ((() => ({ matches: false, addListener: () => {}, removeListener: () => {} })) as unknown as typeof window.matchMedia)
  if (!globalThis.crypto?.subtle) {
    // Node's WebCrypto when jsdom does not provide subtle
    const nodeCrypto = 'node:crypto'
    void import(nodeCrypto).then((mod: { webcrypto: Crypto }) => {
      Object.defineProperty(globalThis, 'crypto', { value: mod.webcrypto, configurable: true })
    })
  }
})

/** Create an encrypted vault + per-tab session for a local member with one photo post and a community. */
async function signInFixture() {
  const now = new Date().toISOString()
  const payload = {
    authUserId: 'u_me',
    users: [
      {
        id: 'u_me',
        username: 'tester',
        email: 'tester@example.com',
        displayName: 'Test Pilot',
        bio: 'Testing the ramp.',
        avatar: '',
        cover: 'images/f22-sunset.jpg',
        country: 'Spain',
        countryCode: 'ES',
        interests: ['spotting'],
        identityTags: ['Spotter'],
        favoriteAircraft: [],
        followers: 0,
        following: 0,
        friends: 0,
        postsCount: 1,
        xp: 150,
        badges: [],
        frame: 'none',
        visibility: 'public',
        joinedAt: now,
        stats: { posts: 1, likesReceived: 0, comments: 0, quizzesPlayed: 0, quizBestScore: 0, quizWins: 0, streak: 0 },
      },
    ],
    posts: [
      {
        id: 'p_test',
        authorId: 'u_me',
        type: 'image',
        text: 'Beautiful morning over the field. #spotting',
        createdAt: now,
        images: ['images/f22-sky.jpg'],
        likes: 0,
        shares: 0,
        comments: [],
        reactions: {},
        hashtags: ['spotting'],
        mentions: [],
        visibility: 'public',
      },
    ],
    communities: [
      {
        id: 'c_test',
        slug: 'test-forum',
        name: 'Test Forum',
        avatar: 'images/f35.jpg',
        banner: 'images/f22-sunset.jpg',
        description: 'Fixture community.',
        rules: [],
        category: 'spotting',
        visibility: 'public',
        memberCount: 1,
        memberIds: ['u_me'],
        adminIds: ['u_me'],
        modIds: [],
        joined: true,
        createdAt: now,
        challenges: [],
      },
    ],
  }
  const { account, dek } = await createAccount('u_me', 'tester', 'test-password-123', TEST_ITERATIONS)
  const sealed = await encryptJson(dek, payload)
  localStorage.setItem(VAULT_KEY, JSON.stringify({ version: 3, accounts: [account], payloads: { u_me: sealed } }))
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ accountId: 'u_me', dek: await exportDek(dek) }))
}

function clearStorage() {
  localStorage.clear()
  sessionStorage.clear()
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 40))
  })
}

async function waitFor(predicate: () => boolean, ms = 15000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (predicate()) return true
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
  }
  return predicate()
}

 {
  const now = new Date().toISOString()
  localStorage.setItem(
    'winglink.state.v2',
    JSON.stringify({
      authUserId: 'u_me',
      users: [
        {
          id: 'u_me',
          username: 'tester',
          email: 'tester@example.com',
          displayName: 'Test Pilot',
          bio: 'Testing the ramp.',
          avatar: '',
          cover: 'images/f22-sunset.jpg',
          country: 'Spain',
          countryCode: 'ES',
          interests: ['spotting'],
          identityTags: ['Spotter'],
          favoriteAircraft: [],
          followers: 0,
          following: 0,
          friends: 0,
          postsCount: 1,
          xp: 150,
          badges: [],
          frame: 'none',
          visibility: 'public',
          joinedAt: now,
          stats: { posts: 1, likesReceived: 0, comments: 0, quizzesPlayed: 0, quizBestScore: 0, quizWins: 0, streak: 0 },
        },
      ],
      posts: [
        {
          id: 'p_test',
          authorId: 'u_me',
          type: 'image',
          text: 'Beautiful morning over the field. #spotting',
          createdAt: now,
          images: ['images/f22-sky.jpg'],
          likes: 0,
          shares: 0,
          comments: [],
          reactions: {},
          hashtags: ['spotting'],
          mentions: [],
          visibility: 'public',
        },
      ],
      communities: [
        {
          id: 'c_test',
          slug: 'test-forum',
          name: 'Test Forum',
          avatar: 'images/f35.jpg',
          banner: 'images/f22-sunset.jpg',
          description: 'Fixture community.',
          rules: [],
          category: 'spotting',
          visibility: 'public',
          memberCount: 1,
          memberIds: ['u_me'],
          adminIds: ['u_me'],
          modIds: [],
          joined: true,
          createdAt: now,
          challenges: [],
        },
      ],
    }),
  )
}

signInFixture()

let container: HTMLDivElement
let root: Root | null = null

async function renderRoute(path: string) {
  if (root) act(() => root!.unmount())
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(
      <I18nProvider>
        <ToastProvider>
          <StoreProvider>
            <MemoryRouter initialEntries={[path]}>
              <App />
            </MemoryRouter>
          </StoreProvider>
        </ToastProvider>
      </I18nProvider>,
    )
  })
  await flush()
  return container
}

beforeEach(async () => {
  await signInFixture()
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  document.body.innerHTML = ''
})

const routes: { path: string; expect: RegExp }[] = [
  { path: '/home', expect: /Home|Inicio/ },
  { path: '/explore', expect: /Explore|Explorar/ },
  { path: '/activities', expect: /Activities|Actividades/ },
  { path: '/activities/aircraft', expect: /Guess the Aircraft|Adivina la aeronave/ },
  { path: '/communities', expect: /Communities|Comunidades/ },
  { path: '/communities/test-forum', expect: /Test Forum/ },
  { path: '/messages', expect: /Messages|Mensajes/ },
  { path: '/aircraft', expect: /Aircraft|Aeronaves/ },
  { path: '/aircraft/f35', expect: /F-35 Lightning II/ },
  { path: '/profile/tester', expect: /Test Pilot/ },
  { path: '/profile/me', expect: /Test Pilot/ },
  { path: '/notifications', expect: /Notifications|Notificaciones/ },
  { path: '/settings', expect: /Settings|Ajustes/ },
  { path: '/search?q=concorde', expect: /Concorde/ },
  { path: '/definitely-not-a-route', expect: /not found|Page not found|no encontrada/i },
]

describe('WingLink route smoke tests', () => {
  for (const r of routes) {
    it(`renders ${r.path}`, async () => {
      const el = await renderRoute(r.path)
      const text = el.textContent ?? ''
      expect(text.length).toBeGreaterThan(20)
      expect(text).toMatch(r.expect)
    })
  }

  it('renders the auth screen when signed out', async () => {
    clearStorage()
    const el = await renderRoute('/auth')
    expect(el.textContent ?? '').toMatch(/Where Aviation Connects|Donde la aviación conecta/i)
  })

  it('redirects signed-out visitors from protected routes to auth (no infinite spinner)', async () => {
    // Regression: with an empty user list the Protected gate used to render
    // a permanent loading spinner instead of redirecting.
    clearStorage()
    const el = await renderRoute('/home')
    expect(el.querySelector('[role="status"]')).toBeNull()
    expect(el.textContent ?? '').toMatch(/Where Aviation Connects|Donde la aviación conecta/i)
  })

  it('shows not-found instead of hanging for unknown community, profile and aircraft', async () => {
    await signInFixture()
    for (const path of ['/communities/no-such-group', '/profile/ghost_user', '/aircraft/nope']) {
      const el = await renderRoute(path)
      expect(el.querySelector('[role="status"]')).toBeNull()
      expect(el.textContent ?? '').toMatch(/not found|no encontrada|Page not found/i)
    }
  })

  it('starts a Guess the Aircraft round', async () => {
    await signInFixture()
    const el = await renderRoute('/activities/aircraft')
    const startBtn = Array.from(el.querySelectorAll('button')).find((b) => /Start round|Empezar/i.test(b.textContent ?? ''))
    expect(startBtn).toBeTruthy()
    act(() => startBtn!.click())
    // four answer options now visible
    const optionButtons = Array.from(el.querySelectorAll('button')).filter((b) => b.textContent && b.textContent.length > 2 && /./.test(b.textContent))
    expect((el.textContent ?? '').match(/Question|Pregunta/)).toBeTruthy()
    expect(optionButtons.length).toBeGreaterThan(3)
  })

  it('opens a post with comments in the feed', async () => {
    await signInFixture()
    const el = await renderRoute('/home')
    const commentBtn = Array.from(el.querySelectorAll('button')).find((b) => /Comment|Comentar/.test(b.textContent ?? ''))
    expect(commentBtn).toBeTruthy()
    act(() => commentBtn!.click())
    expect(el.querySelector('input[placeholder]')).toBeTruthy()
  })

  it('feed is not covered by overlays; image lightbox opens and closes with the X', async () => {
    await signInFixture()
    const el = await renderRoute('/home')
    // Regression: posts with photos used to mount a permanent full-screen
    // lightbox overlay that could not be dismissed.
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    // Click the first post photo (MediaGrid button, excluding avatar images)
    const imgButton = Array.from(el.querySelectorAll('button')).find(
      (b) => b.querySelector('img[src^="images/"]') && !b.querySelector('img[src*="avatar-"]'),
    )
    expect(imgButton).toBeTruthy()
    act(() => imgButton!.click())

    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog!.getAttribute('aria-modal')).toBe('true')

    // Close it with the X button
    const closeBtn = Array.from(dialog!.querySelectorAll('button')).find((b) =>
      ['Close', 'Cerrar'].includes(b.getAttribute('aria-label') ?? ''),
    )
    expect(closeBtn).toBeTruthy()
    act(() => closeBtn!.click())
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it(
    'sign-up stores only ciphertext: password and email never appear in web storage',
    async () => {
      clearStorage()
      const el = await renderRoute('/auth')
      const setInput = (input: HTMLInputElement, value: string) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
        setter.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
      const inputs = Array.from(el.querySelectorAll('input'))
      const [nameInput, usernameInput, emailInput, passwordInput] = inputs as HTMLInputElement[]
      setInput(nameInput, 'Secure Spotter')
      setInput(usernameInput, 'secure_spotter')
      setInput(emailInput, 'secret-inbox@example.com')
      setInput(passwordInput, 'correct-horse-battery')
      // accept the age checkbox
      const ageCheck = inputs.find((i) => i.type === 'checkbox')!
      act(() => {
        ageCheck.click()
      })
      const submitBtn = Array.from(el.querySelectorAll('button')).find((b) => /Join WingLink|Únete/i.test(b.textContent ?? ''))!
      act(() => {
        submitBtn.click()
      })
      const written = await waitFor(() => (localStorage.getItem(VAULT_KEY) ?? '').length > 0)
      expect(written).toBe(true)

      const dump = localStorage.getItem(VAULT_KEY) ?? ''
      expect(dump).toBeTruthy()
      expect(dump).not.toContain('correct-horse-battery')
      expect(dump).not.toContain('secret-inbox@example.com')
      expect(sessionStorage.getItem(SESSION_KEY) ?? '').not.toContain('correct-horse-battery')
      // signed in and landed on the feed
      expect(el.textContent ?? '').toMatch(/Home|Inicio/)
    },
    20000,
  )
})
