import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { adminApi } from '../../api/client'
import StatCard from '../../components/StatCard'
import { ReportsResponse, LocationReport } from '../../types'

export default function AdminSaptamanal() {
  const { data, isLoading } = useQuery<ReportsResponse>({ queryKey: ['admin', 'saptamanal'], queryFn: adminApi.saptamanal })
  const [activeTab, setActiveTab] = useState<string>()
  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null
  const tab = activeTab ?? data.locatii[0]?.numeLocatie ?? 'TOTAL'
  const tabs = [...data.locatii.map(l => l.numeLocatie), 'TOTAL']
  const r: LocationReport = data.reports[tab]
  if (!r) return null

  const chart = [
    { name: 'CASH', cur: r.saptamanaCurenta?.incasariTipPlata?.CASH ?? 0, prev: r.saptamanaTrecuta?.incasariTipPlata?.CASH ?? 0 },
    { name: 'CARD', cur: r.saptamanaCurenta?.incasariTipPlata?.CARD ?? 0, prev: r.saptamanaTrecuta?.incasariTipPlata?.CARD ?? 0 },
    { name: 'CURS', cur: r.saptamanaCurenta?.incasariTipPlata?.CURS ?? 0, prev: r.saptamanaTrecuta?.incasariTipPlata?.CURS ?? 0 },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Raport Saptamanal</h2>
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tab === t ? 'bg-brand text-white border-brand' : 'card text-gray-600 dark:text-gray-300 hover:border-brand'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard index={0} label="Spalari" value={r.saptamanaCurenta?.spalari ?? 0} trend={(r.saptamanaCurenta?.spalari ?? 0) - (r.saptamanaTrecuta?.spalari ?? 0)} />
        <StatCard index={1} label="Incasari" value={`${r.saptamanaCurenta?.incasari?.toFixed(0) ?? 0} RON`} trend={(r.saptamanaCurenta?.incasari ?? 0) - (r.saptamanaTrecuta?.incasari ?? 0)} />
        <StatCard index={2} label="Clienti" value={r.saptamanaCurenta?.clientiNoi ?? 0} trend={(r.saptamanaCurenta?.clientiNoi ?? 0) - (r.saptamanaTrecuta?.clientiNoi ?? 0)} />
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Incasari Tip Plata — Sapt. Curenta vs Trecuta</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chart}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v} RON`]} />
            <Bar dataKey="cur" name="Curenta" fill="#2563eb" radius={[4,4,0,0]} />
            <Bar dataKey="prev" name="Trecuta" fill="#93c5fd" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}
