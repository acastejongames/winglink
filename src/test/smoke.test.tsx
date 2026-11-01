// Runtime smoke test: renders every route of the app inside the full provider
// stack and asserts that each one mounts without throwing and shows its content.
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { I18nProvider } from '../lib/i18n'
import { StoreProvider } from '../lib/store'
import { ToastProvider } from '../components/ui/Toast'

// jsdom shims used by the app
beforeAll(() => {
  ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  Element.prototype.scrollIntoView = () => {}
  window.matchMedia =
    window.matchMedia ||
    ((() => ({ matches: false, addListener: () => {}, removeListener: () => {} })) as unknown as typeof window.matchMedia)
})

/** Sign in as a locally-created member with one photo post and a community. */
function signInFixture() {
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

function renderRoute(path: string) {
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
  return container
}

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
    it(`renders ${r.path}`, () => {
      const el = renderRoute(r.path)
      const text = el.textContent ?? ''
      expect(text.length).toBeGreaterThan(20)
      expect(text).toMatch(r.expect)
    })
  }

  it('renders the auth screen when signed out', () => {
    localStorage.removeItem('winglink.state.v2')
    const el = renderRoute('/auth')
    expect(el.textContent ?? '').toMatch(/Where Aviation Connects|Donde la aviación conecta/i)
  })

  it('redirects signed-out visitors from protected routes to auth (no infinite spinner)', () => {
    // Regression: with an empty user list the Protected gate used to render
    // a permanent loading spinner instead of redirecting.
    localStorage.removeItem('winglink.state.v2')
    const el = renderRoute('/home')
    expect(el.querySelector('[role="status"]')).toBeNull()
    expect(el.textContent ?? '').toMatch(/Where Aviation Connects|Donde la aviación conecta/i)
  })

  it('shows not-found instead of hanging for unknown community, profile and aircraft', () => {
    signInFixture()
    for (const path of ['/communities/no-such-group', '/profile/ghost_user', '/aircraft/nope']) {
      const el = renderRoute(path)
      expect(el.querySelector('[role="status"]')).toBeNull()
      expect(el.textContent ?? '').toMatch(/not found|no encontrada|Page not found/i)
    }
  })

  it('starts a Guess the Aircraft round', () => {
    signInFixture()
    const el = renderRoute('/activities/aircraft')
    const startBtn = Array.from(el.querySelectorAll('button')).find((b) => /Start round|Empezar/i.test(b.textContent ?? ''))
    expect(startBtn).toBeTruthy()
    act(() => startBtn!.click())
    // four answer options now visible
    const optionButtons = Array.from(el.querySelectorAll('button')).filter((b) => b.textContent && b.textContent.length > 2 && /./.test(b.textContent))
    expect((el.textContent ?? '').match(/Question|Pregunta/)).toBeTruthy()
    expect(optionButtons.length).toBeGreaterThan(3)
  })

  it('opens a post with comments in the feed', () => {
    signInFixture()
    const el = renderRoute('/home')
    const commentBtn = Array.from(el.querySelectorAll('button')).find((b) => /Comment|Comentar/.test(b.textContent ?? ''))
    expect(commentBtn).toBeTruthy()
    act(() => commentBtn!.click())
    expect(el.querySelector('input[placeholder]')).toBeTruthy()
  })

  it('feed is not covered by overlays; image lightbox opens and closes with the X', () => {
    signInFixture()
    const el = renderRoute('/home')
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
})
