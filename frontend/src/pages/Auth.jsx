import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const initialRegister = {
  name: '',
  email: '',
  password: '',
  role: 'salesperson'
}

export default function Auth({ onAuth }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState(initialRegister)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const response = await api.post('/auth/login', loginForm)
      onAuth(response.data.user)
      navigate('/dashboard')
    } catch (error) {
      setMessage(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await api.post('/auth/register', registerForm)
      setMessage('Registration successful. Please log in.')
      setMode('login')
      setRegisterForm(initialRegister)
    } catch (error) {
      setMessage(error.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-glow lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden p-8 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.18),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.18),_transparent_28%)]" />
          <div className="relative z-10 max-w-xl">
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">SmartCRM AI</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-white lg:text-6xl">SmartCRM AI — Local-first CRM with predictive intelligence</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              Capture and manage leads, surface conversion likelihood, analyze customer sentiment, and predict churn using on-device machine learning. Designed for secure, offline demos and portfolio-ready presentations.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                ['Enterprise-Ready Architecture', 'Local-first deployment for secure, portable demonstrations and interviews.'],
                ['AI-Powered Insights', 'On-device models: Random Forest lead scoring, Logistic Regression churn prediction, and TextBlob sentiment analysis.'],
                ['End-to-End CRM Workflows', 'Full lead lifecycle: capture, interactions, status tracking, and customer conversion.'],
                ['Modern Design System', 'Responsive dashboard with charts, tables, and accessible UI components for professional demos.']
              ].map(([title, text]) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm text-slate-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-slate-900/90 p-8 lg:border-t-0 lg:border-l lg:p-12">
          <div className="mb-8 flex rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${mode === 'login' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${mode === 'register' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              Register
            </button>
          </div>

          {message ? <div className="mb-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">{message}</div> : null}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
                  placeholder="admin@smartcrm.local"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Login'}
              </button>
              <p className="text-sm text-slate-400">
                Demo accounts: <span className="text-white">admin@smartcrm.local / admin123</span> or <span className="text-white">sales@smartcrm.local / sales123</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Name</label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Password</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                  placeholder="Create a password"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Role</label>
                <select
                  value={registerForm.role}
                  onChange={(event) => setRegisterForm({ ...registerForm, role: event.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  <option value="salesperson">Salesperson</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
