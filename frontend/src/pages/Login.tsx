import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, isLoggingIn, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate(user.rol === 'manager' ? '/manager/dashboard' : '/admin/overview', { replace: true })
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const u = await login({ username, password })
      navigate(u.rol === 'manager' ? '/manager/dashboard' : '/admin/overview', { replace: true })
    } catch {
      setError('Username sau parola incorecte.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold tracking-widest text-brand"
          >
            CARHAUS
          </motion.h1>
          <p className="text-sm text-gray-400 mt-1 tracking-wide">Management Spalatorie Auto</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Username</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="form-input" required autoFocus
              />
            </div>
            <div>
              <label className="form-label">Parola</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="form-input" required
              />
            </div>
            <button type="submit" disabled={isLoggingIn} className="btn-primary w-full py-2.5 mt-2">
              {isLoggingIn ? 'Se conecteaza...' : 'Conectare'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
