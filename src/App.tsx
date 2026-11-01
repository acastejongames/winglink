import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useStore } from './lib/store'
import { AppShell } from './layout/AppShell'
import { Spinner } from './components/ui/Primitives'
import AuthPage from './pages/AuthPage'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Activities from './pages/Activities'
import Quiz from './pages/Quiz'
import Communities from './pages/Communities'
import CommunityDetail from './pages/CommunityDetail'
import Messages from './pages/Messages'
import AircraftPage from './pages/AircraftPage'
import AircraftDetail from './pages/AircraftDetail'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import SettingsPage from './pages/SettingsPage'
import SearchPage from './pages/SearchPage'
import NotFound from './pages/NotFound'

function Protected({ children }: { children: ReactNode }) {
  const { me, state } = useStore()
  const location = useLocation()
  if (state.users.length === 0) return <Spinner />
  if (!me) return <Navigate to="/auth" state={{ from: location }} replace />
  return <>{children}</>
}

export default function App() {
  const { me } = useStore()
  return (
    <Routes>
      <Route path="/auth" element={me ? <Navigate to="/home" replace /> : <AuthPage />} />
      <Route
        path="*"
        element={
          <Protected>
            <AppShell>
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<Home />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/activities" element={<Activities />} />
                <Route path="/activities/:mode" element={<Quiz />} />
                <Route path="/communities" element={<Communities />} />
                <Route path="/communities/:slug" element={<CommunityDetail />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:id" element={<Messages />} />
                <Route path="/aircraft" element={<AircraftPage />} />
                <Route path="/aircraft/:id" element={<AircraftDetail />} />
                <Route path="/profile/:username" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppShell>
          </Protected>
        }
      />
    </Routes>
  )
}
