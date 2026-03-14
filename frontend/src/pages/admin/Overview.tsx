import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { adminApi } from '../../api/client'
import StatCard from '../../components/StatCard'
import { ReportsResponse, LocationReport } from '../../types'

const BRAND = '#8B5E3C'

export default function AdminOverview() {
  const { data, isLoading } = useQuery<ReportsResponse>({ queryKey: ['admin', 'overview'], queryFn: adminApi.overview })
  const [activeTab, setActiveTab] = useState<string>()

  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null

  const tab = activeTab ?? data.locatii[0]?.numeLocatie ?? 'TOTAL'
  const tabs = [...data.locatii.map(l => l.numeLocatie), 'TOTAL']
  const r: LocationReport = data.reports[tab]
  if (!r) return null

  const barData = [
    { name: 'Ieri', value: r.ziuaTrecuta?.incasari ?? 0 },
    { name: 'Sapt. Trec.', value: r.saptamanaTrecuta?.incasari ?? 0 },
    { name: 'Luna Trec.', value: r.lunaTrecuta?.incasari ?? 0 },
    { name: 'Azi', value: r.ziuaCurenta?.incasari ?? 0 },
    { name: 'Sapt. Cur.', value: r.saptamanaCurenta?.incasari ?? 0 },
    { name: 'Luna Cur.', value: r.lunaCurenta?.incasari ?? 0 },
  ]

  const plataData = [
    { name: 'CASH', value: r.ziuaCurenta?.spalariTipPlata?.CASH ?? 0, color: '#22c55e' },
    { name: 'CARD', value: r.ziuaCurenta?.spalariTipPlata?.CARD ?? 0, color: '#3b82f6' },
    { name: 'CURS', value: r.ziuaCurenta?.spalariTipPlata?.CURS ?? 0, color: '#f59e0b' },
  ]

  const washerData = Object.entries(r.ziuaCurenta?.spalariPerSpalator ?? {})
    .map(([name, value]) => ({ name, value }))

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Overview</h2>

      {/* Location tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              tab === t ? 'bg-brand text-white border-brand' : 'card text-gray-600 dark:text-gray-300 hover:border-brand'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard index={0} label="Azi" value={`${r.ziuaCurenta?.incasari?.toFixed(0) ?? 0} RON`}
          sub={`${r.ziuaCurenta?.spalari ?? 0} spalari`} trend={(r.ziuaCurenta?.incasari ?? 0) - (r.ziuaTrecuta?.incasari ?? 0)} />
        <StatCard index={1} label="Sapt. Curenta" value={`${r.saptamanaCurenta?.incasari?.toFixed(0) ?? 0} RON`}
          sub={`${r.saptamanaCurenta?.spalari ?? 0} spalari`} trend={(r.saptamanaCurenta?.incasari ?? 0) - (r.saptamanaTrecuta?.incasari ?? 0)} />
        <StatCard index={2} label="Luna Curenta" value={`${r.lunaCurenta?.incasari?.toFixed(0) ?? 0} RON`}
          sub={`${r.lunaCurenta?.spalari ?? 0} spalari`} trend={(r.lunaCurenta?.incasari ?? 0) - (r.lunaTrecuta?.incasari ?? 0)} />
        <StatCard index={3} label="Clienti Azi" value={r.ziuaCurenta?.clientiNoi ?? 0}
          trend={(r.ziuaCurenta?.clientiNoi ?? 0) - (r.ziuaTrecuta?.clientiNoi ?? 0)} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Incasari pe Perioade</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v} RON`, 'Incasari']} />
              <Bar dataKey="value" fill={BRAND} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Tip Plata — Azi</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={plataData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                {plataData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Washers table */}
      {washerData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Spalatori — Azi</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Spalator</th>
                <th className="px-4 py-2 text-right">Spalari</th>
                <th className="px-4 py-2 text-right">Comision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {washerData.map(({ name, value }) => (
                <tr key={name} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-2 font-medium">{name}</td>
                  <td className="px-4 py-2 text-right">{value}</td>
                  <td className="px-4 py-2 text-right text-brand font-medium">
                    {r.ziuaCurenta?.comisionPerSpalator?.[name]?.toFixed(0) ?? 0} RON
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  )
}
