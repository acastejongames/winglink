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
  // seed a signed-in demo member so protected routes render
  localStorage.setItem('winglink.state.v1', JSON.stringify({ authUserId: 'u_alex' }))
})

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
  { path: '/communities/fighter-aviation', expect: /Fighter Aviation/ },
  { path: '/messages', expect: /Messages|Mensajes/ },
  { path: '/aircraft', expect: /Aircraft|Aeronaves/ },
  { path: '/aircraft/f35', expect: /F-35 Lightning II/ },
  { path: '/profile/spotter_alex', expect: /Alex Rivera/ },
  { path: '/profile/me', expect: /Alex Rivera/ },
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
    localStorage.removeItem('winglink.state.v1')
    const el = renderRoute('/auth')
    expect(el.textContent ?? '').toMatch(/Where Aviation Connects|Donde la aviación conecta/i)
  })

  it('starts a Guess the Aircraft round', () => {
    localStorage.setItem('winglink.state.v1', JSON.stringify({ authUserId: 'u_alex' }))
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
    const el = renderRoute('/home')
    const commentBtn = Array.from(el.querySelectorAll('button')).find((b) => /Comment|Comentar/.test(b.textContent ?? ''))
    expect(commentBtn).toBeTruthy()
    act(() => commentBtn!.click())
    expect(el.querySelector('input[placeholder]')).toBeTruthy()
  })
})
