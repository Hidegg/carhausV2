import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, Car, Users, TrendingUp,
  Calendar, CalendarDays, Settings, LogOut, BarChart2
} from 'lucide-react'

const adminLinks = [
  { to: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/zilnic', label: 'Zilnic', icon: Calendar },
  { to: '/admin/saptamanal', label: 'Saptamanal', icon: CalendarDays },
  { to: '/admin/lunar', label: 'Lunar', icon: TrendingUp },
  { to: '/admin/spalatori', label: 'Spalatori', icon: Users },
]

const managerLinks = [
  { to: '/manager/form', label: 'Formular Auto', icon: Car },
  { to: '/manager/dashboard', label: 'Spalari Azi', icon: LayoutDashboard },
  { to: '/manager/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/manager/echipa', label: 'Echipa mea', icon: Users },
]

interface Props { onClose: () => void }

export default function Sidebar({ onClose }: Props) {
  const { user, logout } = useAuth()
  const links = user?.rol === 'manager' ? managerLinks : adminLinks

  return (
    <aside className="w-52 h-full bg-white dark:bg-[#1f1f1f] border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-xl">
      <nav className="flex-1 py-4 overflow-y-auto">
        <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
          {user?.rol === 'manager' ? 'Inregistrare' : 'Dashboard'}
        </p>

        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to} onClick={onClose}
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
        ))}

        {user?.rol !== 'manager' && (
          <>
            <div className="my-3 border-t border-gray-100 dark:border-gray-700" />
            <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Configurare
            </p>
            <NavLink
              to="/admin/settings" onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium border-l-[3px] transition-colors ` +
                (isActive
                  ? 'border-brand text-brand bg-brand/5 dark:bg-white/5'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-brand hover:bg-gray-50 dark:hover:bg-gray-800')
              }
            >
              <Settings size={16} />
              Setari
            </NavLink>
          </>
        )}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{user?.rol}</p>
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
