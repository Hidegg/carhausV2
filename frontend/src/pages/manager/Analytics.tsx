import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { managerApi } from '../../api/client'

interface ServiceItem { serviciu: string; masina: string; pret: number; ora: string }
interface SpalatorStat { name: string; servicii: number; total: number; comision: number; items: ServiceItem[] }
interface ServiciuStat { name: string; count: number; total: number }
interface AnalyticsData {
  total: number; cash: number; card: number; curs: number; contract: number; protocol: number
  masini: number; servicii_count: number
  spalatori: SpalatorStat[]
  servicii_breakdown: ServiciuStat[]
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`card p-4 flex flex-col gap-1 ${accent ? 'border-brand' : ''}`}>
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${accent ? 'text-brand' : 'text-gray-900 dark:text-white'}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

function getBucharestDate() {
  const now = new Date()
  const tz = 'Europe/Bucharest'
  const weekday = new Intl.DateTimeFormat('ro-RO', { timeZone: tz, weekday: 'long' }).format(now)
  const day = new Intl.DateTimeFormat('ro-RO', { timeZone: tz, day: 'numeric' }).format(now)
  const month = new Intl.DateTimeFormat('ro-RO', { timeZone: tz, month: 'long' }).format(now)
  const year = new Intl.DateTimeFormat('ro-RO', { timeZone: tz, year: 'numeric' }).format(now)
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} - ${day} ${month} ${year}`
}

export default function ManagerAnalytics() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showComision, setShowComision] = useState(false)
  const dateLabel = useMemo(() => getBucharestDate(), [])

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['manager', 'analytics'],
    queryFn: managerApi.analytics,
    refetchInterval: 30_000,
  })

  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null

  // CURS = pending proxy, never real income
  const collected = data.cash + data.card + data.contract + data.protocol
  const pending = data.curs

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">{dateLabel}</h2>

      {/* Top summary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Incasat" value={`${collected.toFixed(0)} RON`} sub="fara CURS" accent />
        <StatCard label="De Incasat" value={`${pending.toFixed(0)} RON`} sub="CURS in asteptare" />
        <StatCard label="Masini" value={String(data.masini)} sub="vehicule azi" />
        <StatCard label="Servicii" value={String(data.servicii_count)} sub="total operatiuni" />
      </motion.div>

      {/* Payment breakdown */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="card p-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Incasari</h3>
        <div className="grid grid-cols-3 gap-4 gap-y-5">
          {/* Collected: CASH / CARD / CONTRACT / PROTOCOL */}
          <div className="col-span-3 grid grid-cols-2 gap-4">
            {[
              { label: 'CASH',     value: data.cash,     color: 'bg-green-500'  },
              { label: 'CARD',     value: data.card,     color: 'bg-blue-500'   },
              { label: 'CONTRACT', value: data.contract, color: 'bg-purple-500' },
              { label: 'PROTOCOL', value: data.protocol, color: 'bg-orange-500' },
            ].map(({ label, value, color }) => {
              const pct = collected > 0 ? (value / collected) * 100 : 0
              return (
                <div key={label}>
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-xs font-medium text-gray-500">{label}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{value.toFixed(0)} RON</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}%</div>
                </div>
              )
            })}
          </div>
          {/* CURS — pending, separate section */}
          {data.curs > 0 && (
          <div className="col-span-3">
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">CURS <span className="text-gray-400 font-normal">— de incasat</span></span>
              <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{data.curs.toFixed(0)} RON</span>
            </div>
            <div className="h-1.5 bg-yellow-100 dark:bg-yellow-900/20 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full w-full" />
            </div>
          </div>
          )}
        </div>
      </motion.div>

      {/* Spalatori */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Echipa</h3>
          <button
            onClick={() => setShowComision(v => !v)}
            className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
              showComision
                ? 'bg-brand text-white border-brand'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-brand'
            }`}>
            {showComision ? 'Ascunde Comisioane' : 'Arata Comisioane'}
          </button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.spalatori.sort((a, b) => b.total - a.total).map((s, i) => (
            <div key={s.name}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.04 }}
                className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(expanded === s.name ? null : s.name)}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-xs text-gray-400">{s.servicii} {s.servicii === 1 ? 'serviciu' : 'servicii'}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{s.total.toFixed(0)} RON</div>
                  {showComision && (
                    <div className="text-xs text-brand font-medium">comision {s.comision.toFixed(0)} RON</div>
                  )}
                </div>
              </motion.div>
              <AnimatePresence>
                {expanded === s.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="overflow-hidden bg-gray-50 dark:bg-white/[0.03] border-t border-gray-100 dark:border-gray-800">
                    {s.items.map((item, j) => (
                      <div key={j} className="px-6 py-2 flex items-center justify-between text-xs border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{item.serviciu}</span>
                        <div className="flex items-center gap-3 text-gray-400">
                          <span>{item.ora}</span>
                          <span className="font-semibold text-brand">{item.pret.toFixed(0)} RON</span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Services breakdown */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Servicii Prestate</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.servicii_breakdown.sort((a, b) => b.total - a.total).map((s, i) => (
            <div key={s.name} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-gray-400">{s.count}x</div>
              </div>
              <div className="text-sm font-bold text-brand">{s.total.toFixed(0)} RON</div>
            </div>
          ))}
        </div>
      </motion.div>

    </div>
  )
}
