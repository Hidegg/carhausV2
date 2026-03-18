import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '../../api/client'
import { ReportsResponse, LocationReport } from '../../types'

function PaymentBar({ r }: { r: LocationReport }) {
  const payments = [
    { key: 'CASH',     val: r.ziuaCurenta?.incasariTipPlata?.CASH     ?? 0, color: 'bg-green-500' },
    { key: 'CARD',     val: r.ziuaCurenta?.incasariTipPlata?.CARD     ?? 0, color: 'bg-blue-500' },
    { key: 'CURS',     val: r.ziuaCurenta?.incasariTipPlata?.CURS     ?? 0, color: 'bg-yellow-500' },
    { key: 'CONTRACT', val: r.ziuaCurenta?.incasariTipPlata?.CONTRACT ?? 0, color: 'bg-purple-500' },
    { key: 'PROTOCOL', val: r.ziuaCurenta?.incasariTipPlata?.PROTOCOL ?? 0, color: 'bg-gray-400' },
  ].filter(p => p.val > 0)

  const total = payments.reduce((s, p) => s + p.val, 0)
  if (total === 0) return <p className="text-sm text-gray-400">Nicio incasare azi</p>

  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-2 mb-3">
        {payments.map(p => (
          <div key={p.key} className={p.color} style={{ width: `${(p.val / total) * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {payments.map(p => (
          <div key={p.key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${p.color}`} />
            <span className="text-xs text-gray-500">{p.key}</span>
            <span className="text-xs font-semibold">{p.val.toFixed(0)} RON</span>
            <span className="text-xs text-gray-400">({((p.val / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminOverview() {
  const { data, isLoading } = useQuery<ReportsResponse>({
    queryKey: ['admin', 'overview'],
    queryFn: adminApi.overview,
    refetchInterval: 60_000,
  })
  const [activeTab, setActiveTab] = useState<string>()

  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null

  const tabs = [...data.locatii.map(l => l.numeLocatie), 'TOTAL']
  const tab = activeTab ?? tabs[0]
  const r: LocationReport = data.reports[tab]
  if (!r) return null

  const az = r.ziuaCurenta
  const ieri = r.ziuaTrecuta
  const avgAzi = (az?.spalari ?? 0) > 0 ? (az?.incasari ?? 0) / (az?.spalari ?? 1) : 0

  const washerData = Object.entries(az?.spalariPerSpalator ?? {})
    .map(([name, spalari]) => ({ name, spalari, comision: az?.comisionPerSpalator?.[name] ?? 0 }))
    .sort((a, b) => b.spalari - a.spalari)

  const locationData = tabs
    .filter(t => t !== 'TOTAL')
    .map(t => ({
      name: t,
      incasari: data.reports[t]?.ziuaCurenta?.incasari ?? 0,
      spalari: data.reports[t]?.ziuaCurenta?.spalari ?? 0,
      masini: data.reports[t]?.ziuaCurenta?.clientiNoi ?? 0,
    }))

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                tab === t ? 'bg-brand text-white border-brand' : 'card text-gray-600 dark:text-gray-300 hover:border-brand'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Incasari Azi', value: `${(az?.incasari ?? 0).toFixed(0)} RON` },
          { label: 'Masini', value: az?.clientiNoi ?? 0 },
          { label: 'Servicii', value: az?.spalari ?? 0 },
          { label: 'Medie / Masina', value: `${avgAzi.toFixed(0)} RON` },
        ].map(({ label, value }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="card p-4 flex flex-col">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Payment split */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-4 mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Incasari pe tip plata — Azi</p>
        <PaymentBar r={r} />
      </motion.div>

      {/* Bottom: location table for TOTAL, washer table for specific location */}
      {tab === 'TOTAL' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Locatii — Azi</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Locatie</th>
                <th className="px-4 py-2 text-right">Masini</th>
                <th className="px-4 py-2 text-right">Servicii</th>
                <th className="px-4 py-2 text-right">Incasari</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {locationData.map(l => (
                <tr key={l.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-2.5 font-medium">{l.name}</td>
                  <td className="px-4 py-2.5 text-right">{l.masini}</td>
                  <td className="px-4 py-2.5 text-right">{l.spalari}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-brand">{l.incasari.toFixed(0)} RON</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      ) : washerData.length > 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Spalatori — Azi</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Spalator</th>
                <th className="px-4 py-2 text-right">Spalari</th>
                <th className="px-4 py-2 text-right">Comision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {washerData.map(w => (
                <tr key={w.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-2.5 font-medium">{w.name}</td>
                  <td className="px-4 py-2.5 text-right">{w.spalari}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-brand">{w.comision.toFixed(0)} RON</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      ) : (
        <div className="card p-8 text-center text-sm text-gray-400">
          Nicio spalare inregistrata azi
        </div>
      )}
    </div>
  )
}
