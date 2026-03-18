import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { adminApi } from '../../api/client'
import StatCard from '../../components/StatCard'
import { ReportsResponse, LocationReport } from '../../types'

export default function AdminZilnic() {
  const { data, isLoading } = useQuery<ReportsResponse>({ queryKey: ['admin', 'zilnic'], queryFn: adminApi.zilnic })
  const [activeTab, setActiveTab] = useState<string>()
  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null
  const tab = activeTab ?? data.locatii[0]?.numeLocatie ?? 'TOTAL'
  const tabs = [...data.locatii.map(l => l.numeLocatie), 'TOTAL']
  const r: LocationReport = data.reports[tab]
  if (!r) return null

  const plataChart = [
    { name: 'CASH', azi: r.ziuaCurenta?.spalariTipPlata?.CASH ?? 0, ieri: r.ziuaTrecuta?.spalariTipPlata?.CASH ?? 0 },
    { name: 'CARD', azi: r.ziuaCurenta?.spalariTipPlata?.CARD ?? 0, ieri: r.ziuaTrecuta?.spalariTipPlata?.CARD ?? 0 },
    { name: 'CURS', azi: r.ziuaCurenta?.spalariTipPlata?.CURS ?? 0, ieri: r.ziuaTrecuta?.spalariTipPlata?.CURS ?? 0 },
  ]
  const incasariChart = [
    { name: 'CASH', azi: r.ziuaCurenta?.incasariTipPlata?.CASH ?? 0, ieri: r.ziuaTrecuta?.incasariTipPlata?.CASH ?? 0 },
    { name: 'CARD', azi: r.ziuaCurenta?.incasariTipPlata?.CARD ?? 0, ieri: r.ziuaTrecuta?.incasariTipPlata?.CARD ?? 0 },
    { name: 'CURS', azi: r.ziuaCurenta?.incasariTipPlata?.CURS ?? 0, ieri: r.ziuaTrecuta?.incasariTipPlata?.CURS ?? 0 },
  ]
  const spalatorChart = Object.entries(r.ziuaCurenta?.spalariPerSpalator ?? {}).map(([name, value]) => ({ name, value }))

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Raport Zilnic</h2>
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tab === t ? 'bg-brand text-white border-brand' : 'card text-gray-600 dark:text-gray-300 hover:border-brand'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard index={0} label="Spalari Azi" value={r.ziuaCurenta?.spalari ?? 0} trend={(r.ziuaCurenta?.spalari ?? 0) - (r.ziuaTrecuta?.spalari ?? 0)} />
        <StatCard index={1} label="Incasari Azi" value={`${r.ziuaCurenta?.incasari?.toFixed(0) ?? 0} RON`} trend={(r.ziuaCurenta?.incasari ?? 0) - (r.ziuaTrecuta?.incasari ?? 0)} />
        <StatCard index={2} label="Clienti Azi" value={r.ziuaCurenta?.clientiNoi ?? 0} trend={(r.ziuaCurenta?.clientiNoi ?? 0) - (r.ziuaTrecuta?.clientiNoi ?? 0)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Spalari Tip Plata — Azi vs Ieri</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={plataChart}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="azi" name="Azi" fill="#2563eb" radius={[4,4,0,0]} />
              <Bar dataKey="ieri" name="Ieri" fill="#93c5fd" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="card p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Incasari Tip Plata — Azi vs Ieri (RON)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={incasariChart}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(0)} RON`]} />
              <Bar dataKey="azi" name="Azi" fill="#2563eb" radius={[4,4,0,0]} />
              <Bar dataKey="ieri" name="Ieri" fill="#93c5fd" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Spalari per Spalator — Azi</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={spalatorChart} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" name="Spalari" fill="#2563eb" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  )
}
