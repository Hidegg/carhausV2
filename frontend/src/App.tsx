import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, useAuthProvider, AuthContext } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import ManagerForm from './pages/manager/Form'
import ManagerDashboard from './pages/manager/Dashboard'
import ManagerEchipa from './pages/manager/Echipa'
import ManagerAnalytics from './pages/manager/Analytics'
import AdminOverview from './pages/admin/Overview'
import AdminRapoarte from './pages/admin/Rapoarte'
import AdminIstoric from './pages/admin/Istoric'
import AdminClienti from './pages/admin/Clienti'
import AdminClientDetail from './pages/admin/ClientDetail'
import AdminSpalatori from './pages/admin/Spalatori'
import AdminSettings from './pages/admin/Settings'
import DevOverview from './pages/dev/Overview'
import DevClients from './pages/dev/Clients'
import DevAccounts from './pages/dev/Accounts'
import DevSystem from './pages/dev/System'

function ProtectedRoute({
  children, adminOnly = false, devOnly = false
}: {
  children: React.ReactNode; adminOnly?: boolean; devOnly?: boolean
}) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center h-screen text-brand">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (devOnly && user.rol !== 'dev') return <Navigate to="/" replace />
  if (adminOnly && !['admin', 'dev'].includes(user.rol)) return <Navigate to="/manager/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user, isLoading } = useAuth()

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
      <span className="font-bold text-2xl tracking-widest text-brand animate-pulse">CARHAUS</span>
    </div>
  )

  const defaultPath =
    user?.rol === 'manager' ? '/manager/dashboard' :
    user?.rol === 'dev' ? '/dev/overview' :
    '/admin/overview'

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to={defaultPath} replace /> : <Login />
      } />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Manager */}
        <Route path="/manager/form" element={<ManagerForm />} />
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/manager/echipa" element={<ManagerEchipa />} />
        <Route path="/manager/analytics" element={<ManagerAnalytics />} />

        {/* Admin */}
        <Route path="/admin/overview" element={<ProtectedRoute adminOnly><AdminOverview /></ProtectedRoute>} />
        <Route path="/admin/rapoarte" element={<ProtectedRoute adminOnly><AdminRapoarte /></ProtectedRoute>} />
        <Route path="/admin/istoric" element={<ProtectedRoute adminOnly><AdminIstoric /></ProtectedRoute>} />
        <Route path="/admin/clienti" element={<ProtectedRoute adminOnly><AdminClienti /></ProtectedRoute>} />
        <Route path="/admin/clienti/:plate" element={<ProtectedRoute adminOnly><AdminClientDetail /></ProtectedRoute>} />
        <Route path="/admin/spalatori" element={<ProtectedRoute adminOnly><AdminSpalatori /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />

        {/* Dev */}
        <Route path="/dev/overview" element={<ProtectedRoute devOnly><DevOverview /></ProtectedRoute>} />
        <Route path="/dev/clients" element={<ProtectedRoute devOnly><DevClients /></ProtectedRoute>} />
        <Route path="/dev/accounts" element={<ProtectedRoute devOnly><DevAccounts /></ProtectedRoute>} />
        <Route path="/dev/system" element={<ProtectedRoute devOnly><DevSystem /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthProvider()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
