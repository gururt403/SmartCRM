import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/hooks/use-auth'

// Route-level code splitting: the dashboard and its charts never load for
// someone who only opens the leads table.
const Home = lazy(() => import('@/pages/Home'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Leads = lazy(() => import('@/pages/Leads'))
const Customers = lazy(() => import('@/pages/Customers'))
const Deals = lazy(() => import('@/pages/Deals'))
const Tasks = lazy(() => import('@/pages/Tasks'))
const Predictions = lazy(() => import('@/pages/Predictions'))
const Auth = lazy(() => import('@/pages/Auth'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function FullPageSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  )
}

function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <FullPageSpinner label="Starting SmartCRM…" />
  return isAuthenticated ? children : <Navigate to="/auth" replace />
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth()

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route
          path="/auth"
          element={isLoading ? <FullPageSpinner /> : isAuthenticated ? <Navigate to="/home" replace /> : <Auth />}
        />
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
