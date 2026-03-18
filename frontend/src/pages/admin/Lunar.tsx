import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { adminApi } from '../../api/client'
import StatCard from '../../components/StatCard'
import { ReportsResponse, LocationReport } from '../../types'

const PIE_COLORS = ['#2563eb','#3b82f6','#1d4ed8','#60a5fa','#93c5fd','#1e40af']

export default function AdminLunar() {
  const { data, isLoading } = useQuery<ReportsResponse>({ queryKey: ['admin', 'lunar'], queryFn: adminApi.lunar })
  const [activeTab, setActiveTab] = useState<string>()
  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null
  const tab = activeTab ?? data.locatii[0]?.numeLocatie ?? 'TOTAL'
  const tabs = [...data.locatii.map(l => l.numeLocatie), 'TOTAL']
  const r: LocationReport = data.reports[tab]
  if (!r) return null

  const barData = [
    { name: 'CASH', cur: r.lunaCurenta?.incasariTipPlata?.CASH ?? 0, prev: r.lunaTrecuta?.incasariTipPlata?.CASH ?? 0 },
    { name: 'CARD', cur: r.lunaCurenta?.incasariTipPlata?.CARD ?? 0, prev: r.lunaTrecuta?.incasariTipPlata?.CARD ?? 0 },
    { name: 'CURS', cur: r.lunaCurenta?.incasariTipPlata?.CURS ?? 0, prev: r.lunaTrecuta?.incasariTipPlata?.CURS ?? 0 },
  ]
  const serviceData = Object.entries(r.lunaCurenta?.spalariTipServiciu ?? {}).map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }))

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Raport Lunar</h2>
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tab === t ? 'bg-brand text-white border-brand' : 'card text-gray-600 dark:text-gray-300 hover:border-brand'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard index={0} label="Spalari Luna" value={r.lunaCurenta?.spalari ?? 0} trend={(r.lunaCurenta?.spalari ?? 0) - (r.lunaTrecuta?.spalari ?? 0)} />
        <StatCard index={1} label="Incasari Luna" value={`${r.lunaCurenta?.incasari?.toFixed(0) ?? 0} RON`} trend={(r.lunaCurenta?.incasari ?? 0) - (r.lunaTrecuta?.incasari ?? 0)} />
        <StatCard index={2} label="Clienti Luna" value={r.lunaCurenta?.clientiNoi ?? 0} trend={(r.lunaCurenta?.clientiNoi ?? 0) - (r.lunaTrecuta?.clientiNoi ?? 0)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Incasari — Luna Curenta vs Trecuta</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v} RON`]} />
              <Bar dataKey="cur" name="Curenta" fill="#2563eb" radius={[4,4,0,0]} />
              <Bar dataKey="prev" name="Trecuta" fill="#93c5fd" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Servicii — Top Lunar</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={serviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                {serviceData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Legend iconSize={10} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  )
}
