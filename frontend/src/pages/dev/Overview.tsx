import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { devApi } from '../../api/client'
import { DevOverviewResponse } from '../../types'
import StatCard from '../../components/StatCard'

export default function DevOverview() {
  const { data, isLoading } = useQuery<DevOverviewResponse>({
    queryKey: ['dev', 'overview'],
    queryFn: devApi.overview,
    refetchInterval: 60_000,
  })

  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null

  const barData = data.perLocatie.map(l => ({
    name: l.numeLocatie,
    servicii: l.totalServicii,
    incasari: l.totalIncasari,
    clienti: l.totalClienti,
  }))

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">System Overview</h2>
      <p className="text-sm text-gray-400 mb-6">Date cumulate — toate locatiile, toate timpurile</p>

      {/* All-time KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard index={0} label="Total Spalari" value={data.allTime.totalServicii.toLocaleString()} />
        <StatCard index={1} label="Total Incasari" value={`${data.allTime.totalIncasari.toFixed(0)} RON`} />
        <StatCard index={2} label="Total Clienti" value={data.allTime.totalClienti.toLocaleString()} />
        <StatCard index={3} label="Total Comisioane" value={`${data.allTime.totalComision.toFixed(0)} RON`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Spalari per Locatie (all-time)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="servicii" name="Spalari" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Incasari per Locatie (all-time)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(0)} RON`]} />
              <Bar dataKey="incasari" name="Incasari" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Per-location cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {data.perLocatie.map((loc, i) => (
          <motion.div
            key={loc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{loc.numeLocatie}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">
                {loc.totalSpalatori} spalatori
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">Spalari</p>
                <p className="text-lg font-bold">{loc.totalServicii.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Incasari</p>
                <p className="text-lg font-bold">{loc.totalIncasari.toFixed(0)} RON</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Clienti</p>
                <p className="text-base font-semibold">{loc.totalClienti.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Manageri</p>
                <p className="text-base font-semibold">{loc.totalManageri}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Users summary */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="card p-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Conturi Sistem</h3>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand" />
            <span className="text-sm">{data.users.devs} Dev</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm">{data.users.admins} Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm">{data.users.managers} Manageri</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
