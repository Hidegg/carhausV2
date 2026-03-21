import { Menu, Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const PAGE_TITLES: Record<string, string> = {
  '/admin/overview': 'Raport Zilnic',
  '/admin/istoric': 'Istoric',
  '/admin/clienti': 'Clienti',
  '/admin/spalatori': 'Spalatori',
  '/admin/settings': 'Setari',
  '/manager/form': 'Formular Auto',
  '/manager/dashboard': 'Spalari Azi',
  '/manager/analytics': 'Analytics',
  '/manager/echipa': 'Echipa mea',
  '/dev/overview': 'System Overview',
  '/dev/clients': 'Clienti',
  '/dev/accounts': 'Conturi',
  '/dev/system': 'System',
}

interface Props {
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  dark: boolean
  setDark: (v: boolean) => void
}

export default function Navbar({ sidebarOpen, setSidebarOpen, dark, setDark }: Props) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'CARHAUS'

  return (
    <nav className="h-14 flex-shrink-0 flex items-center justify-between px-4 bg-white dark:bg-[#1f1f1f] border-b border-gray-200 dark:border-gray-700 shadow-sm z-50 relative">
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-brand transition-colors">
        <Menu size={22} />
      </button>

      <span className="absolute left-1/2 -translate-x-1/2 font-bold text-lg tracking-wide text-brand">
        {title}
      </span>

      <button onClick={() => setDark(!dark)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-brand transition-colors">
        {dark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </nav>
  )
}
