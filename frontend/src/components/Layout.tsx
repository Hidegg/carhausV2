import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useAuth } from '../hooks/useAuth'

export default function Layout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className={`h-screen flex flex-col overflow-hidden${user?.rol === 'manager' ? ' manager-theme' : user?.rol === 'dev' ? ' dev-theme' : ''}`}>
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} dark={dark} setDark={setDark} />
      <div className="flex flex-1 overflow-hidden relative">
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-30 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                key="sidebar"
                initial={{ x: -220 }} animate={{ x: 0 }} exit={{ x: -220 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)]"
              >
                <Sidebar onClose={() => setSidebarOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <motion.main
          className="flex-1 overflow-y-auto p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className={user?.rol === 'admin' ? 'max-w-2xl mx-auto' : ''}>
            <Outlet />
          </div>
        </motion.main>
      </div>
    </div>
  )
}
