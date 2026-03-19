import { Menu, Moon, Sun } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface Props {
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  dark: boolean
  setDark: (v: boolean) => void
}

export default function Navbar({ sidebarOpen, setSidebarOpen, dark, setDark }: Props) {
  const { user } = useAuth()

  return (
    <nav className="h-14 flex-shrink-0 flex items-center justify-between px-4 bg-white dark:bg-[#1f1f1f] border-b border-gray-200 dark:border-gray-800 shadow-sm z-50 relative">
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-brand transition-colors">
        <Menu size={22} />
      </button>

      <span className="absolute left-1/2 -translate-x-1/2 font-bold text-xl tracking-widest text-brand">
        CARHAUS
      </span>

      <button onClick={() => setDark(!dark)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-brand transition-colors">
        {dark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </nav>
  )
}
