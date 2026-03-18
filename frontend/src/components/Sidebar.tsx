import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, Car, Users, TrendingUp,
  Settings, LogOut, BarChart2,
  Server, Shield, Globe, History, UserSquare2
} from 'lucide-react'

const adminLinks = [
  { to: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/rapoarte', label: 'Rapoarte', icon: TrendingUp },
  { to: '/admin/istoric', label: 'Istoric', icon: History },
  { to: '/admin/clienti', label: 'Clienti', icon: UserSquare2 },
  { to: '/admin/spalatori', label: 'Spalatori', icon: Users },
]

const managerLinks = [
  { to: '/manager/form', label: 'Formular Auto', icon: Car },
  { to: '/manager/dashboard', label: 'Spalari Azi', icon: LayoutDashboard },
  { to: '/manager/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/manager/echipa', label: 'Echipa mea', icon: Users },
]

const devLinks = [
  { to: '/dev/overview', label: 'System Overview', icon: LayoutDashboard },
  { to: '/dev/clients', label: 'Clienti', icon: Globe },
  { to: '/dev/accounts', label: 'Conturi', icon: Shield },
  { to: '/dev/system', label: 'System', icon: Server },
]

interface Props { onClose: () => void }

function NavItem({ to, label, icon: Icon, onClose }: { to: string; label: string; icon: React.ElementType; onClose: () => void }) {
  return (
    <NavLink
      to={to} onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 text-sm font-medium border-l-[3px] transition-colors ` +
        (isActive
          ? 'border-brand text-brand bg-brand/5 dark:bg-white/5'
          : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-brand hover:bg-gray-50 dark:hover:bg-gray-800')
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  )
}

export default function Sidebar({ onClose }: Props) {
  const { user, logout } = useAuth()

  return (
    <aside className="w-52 h-full bg-white dark:bg-[#1f1f1f] border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-xl">
      <nav className="flex-1 py-4 overflow-y-auto">

        {user?.rol === 'manager' && (
          <>
            <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Inregistrare
            </p>
            {managerLinks.map(l => <NavItem key={l.to} {...l} onClose={onClose} />)}
          </>
        )}

        {user?.rol === 'admin' && (
          <>
            <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Dashboard
            </p>
            {adminLinks.map(l => <NavItem key={l.to} {...l} onClose={onClose} />)}
            <div className="my-3 border-t border-gray-100 dark:border-gray-700" />
            <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Configurare
            </p>
            <NavItem to="/admin/settings" label="Setari" icon={Settings} onClose={onClose} />
          </>
        )}

        {user?.rol === 'dev' && (
          <>
            <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Dev
            </p>
            {devLinks.map(l => <NavItem key={l.to} {...l} onClose={onClose} />)}
          </>
        )}

      </nav>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-brand uppercase tracking-wide font-semibold">{user?.rol}</p>
        <p className="text-sm font-medium truncate mb-2">{user?.username}</p>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 w-full text-sm text-red-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </aside>
  )
}
