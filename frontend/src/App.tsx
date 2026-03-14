import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, useAuthProvider, AuthContext } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import ManagerForm from './pages/manager/Form'
import ManagerDashboard from './pages/manager/Dashboard'
import AdminOverview from './pages/admin/Overview'
import AdminZilnic from './pages/admin/Zilnic'
import AdminSaptamanal from './pages/admin/Saptamanal'
import AdminLunar from './pages/admin/Lunar'
import AdminSpalatori from './pages/admin/Spalatori'
import AdminSettings from './pages/admin/Settings'

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center h-screen text-brand">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
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

  const defaultPath = user?.rol === 'manager' ? '/manager/dashboard' : '/admin/overview'

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to={defaultPath} replace /> : <Login />
      } />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/manager/form" element={<ManagerForm />} />
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/admin/overview" element={<ProtectedRoute adminOnly><AdminOverview /></ProtectedRoute>} />
        <Route path="/admin/zilnic" element={<ProtectedRoute adminOnly><AdminZilnic /></ProtectedRoute>} />
        <Route path="/admin/saptamanal" element={<ProtectedRoute adminOnly><AdminSaptamanal /></ProtectedRoute>} />
        <Route path="/admin/lunar" element={<ProtectedRoute adminOnly><AdminLunar /></ProtectedRoute>} />
        <Route path="/admin/spalatori" element={<ProtectedRoute adminOnly><AdminSpalatori /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>} />
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
