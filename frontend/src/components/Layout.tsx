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

  // Lock body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className={`h-dvh flex flex-col overflow-hidden${user?.rol === 'manager' ? ' manager-theme' : user?.rol === 'dev' ? ' dev-theme' : ''}`}>
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} dark={dark} setDark={setDark} />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop sidebar — always visible on md+ */}
        <aside className="hidden md:block shrink-0 h-full">
          <Sidebar onClose={() => {}} />
        </aside>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="md:hidden fixed top-14 inset-x-0 bottom-0 bg-black/40 z-30"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                key="sidebar"
                initial={{ x: -220 }} animate={{ x: 0 }} exit={{ x: -220 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="md:hidden fixed top-14 left-0 z-40 h-[calc(100dvh-3.5rem)]"
              >
                <Sidebar onClose={() => setSidebarOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <motion.main
          className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-6"
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
