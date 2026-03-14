import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { adminApi } from '../../api/client'
import { ReportsResponse, LocationReport } from '../../types'

export default function AdminSpalatori() {
  const { data, isLoading } = useQuery<ReportsResponse>({ queryKey: ['admin', 'spalatori'], queryFn: adminApi.spalatori })
  const [activeTab, setActiveTab] = useState<string>()
  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null
  const tab = activeTab ?? data.locatii[0]?.numeLocatie ?? 'TOTAL'
  const tabs = [...data.locatii.map(l => l.numeLocatie), 'TOTAL']
  const r: LocationReport = data.reports[tab]
  if (!r) return null

  const spData = Object.entries(r.ziuaCurenta?.spalariPerSpalator ?? {}).map(([name, spalari]) => ({
    name, spalari, comision: r.ziuaCurenta?.comisionPerSpalator?.[name] ?? 0
  }))

  const allNames = [...new Set([
    ...Object.keys(r.ziuaCurenta?.spalariPerSpalator ?? {}),
    ...Object.keys(r.saptamanaCurenta?.spalariPerSpalator ?? {}),
    ...Object.keys(r.lunaCurenta?.spalariPerSpalator ?? {}),
  ])]

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Performanta Spalatori</h2>
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tab === t ? 'bg-brand text-white border-brand' : 'card text-gray-600 dark:text-gray-300 hover:border-brand'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="card p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Spalari per Spalator — Azi</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="spalari" name="Spalari" fill="#8B5E3C" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card p-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Comision per Spalator — Azi</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: number) => [`${v} RON`, 'Comision']} />
              <Bar dataKey="comision" name="Comision" fill="#A8784F" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Sumar Spalatori</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Spalator</th>
              <th className="px-4 py-2 text-right">Azi</th>
              <th className="px-4 py-2 text-right">Sapt.</th>
              <th className="px-4 py-2 text-right">Luna</th>
              <th className="px-4 py-2 text-right">Comision Azi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {allNames.map(name => (
              <tr key={name} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-2 font-medium">{name}</td>
                <td className="px-4 py-2 text-right">{r.ziuaCurenta?.spalariPerSpalator?.[name] ?? 0}</td>
                <td className="px-4 py-2 text-right">{r.saptamanaCurenta?.spalariPerSpalator?.[name] ?? 0}</td>
                <td className="px-4 py-2 text-right">{r.lunaCurenta?.spalariPerSpalator?.[name] ?? 0}</td>
                <td className="px-4 py-2 text-right text-brand font-medium">{r.ziuaCurenta?.comisionPerSpalator?.[name]?.toFixed(0) ?? 0} RON</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  )
}
