import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import api from './services/api'
import LoadingSpinner from './components/LoadingSpinner'
import PageShell from './components/PageShell'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Predictions from './pages/Predictions'
import NotFound from './pages/NotFound'

function ProtectedLayout({ user, onLogout }) {
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return (
    <PageShell
      user={user}
      onLogout={onLogout}
      title="Operations Dashboard"
      subtitle="Manage leads, monitor predictions, and review analytics from one local CRM workspace."
    />
  )
}

function RootRedirect({ user }) {
  return <Navigate to={user ? '/dashboard' : '/auth'} replace />
}

export default function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await api.get('/auth/me')
        setUser(response.data.user)
      } catch {
        setUser(null)
      } finally {
        setBooting(false)
      }
    }

    loadUser()
  }, [])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
      navigate('/auth')
    }
  }

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <LoadingSpinner label="Starting SmartCRM AI..." />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<RootRedirect user={user} />} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth onAuth={setUser} />} />
      <Route element={<ProtectedLayout user={user} onLogout={handleLogout} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/predictions" element={<Predictions />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
