import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, Car, Users, TrendingUp,
  Settings, BarChart2,
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
        `flex items-center gap-3 px-5 py-3.5 text-sm font-medium border-l-[3px] transition-colors ` +
        (isActive
          ? 'border-brand text-brand bg-brand/5 dark:bg-white/5'
          : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-brand hover:bg-gray-50 dark:hover:bg-gray-800')
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )
}

export default function Sidebar({ onClose }: Props) {
  const { user } = useAuth()

  return (
    <aside className="w-56 h-full bg-white dark:bg-[#1f1f1f] border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-xl overflow-y-auto">
      <nav className="flex-1 py-5">

        {user?.rol === 'manager' && (
          <>
            <p className="px-5 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Inregistrare
            </p>
            {managerLinks.map(l => <NavItem key={l.to} {...l} onClose={onClose} />)}
          </>
        )}

        {user?.rol === 'admin' && (
          <>
            <p className="px-5 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Dashboard
            </p>
            {adminLinks.map(l => <NavItem key={l.to} {...l} onClose={onClose} />)}
            <div className="my-4 border-t border-gray-100 dark:border-gray-700" />
            <p className="px-5 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Configurare
            </p>
            <NavItem to="/admin/settings" label="Setari" icon={Settings} onClose={onClose} />
          </>
        )}

        {user?.rol === 'dev' && (
          <>
            <p className="px-5 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Dev
            </p>
            {devLinks.map(l => <NavItem key={l.to} {...l} onClose={onClose} />)}
          </>
        )}

      </nav>
    </aside>
  )
}
