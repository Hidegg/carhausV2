import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { adminApi } from '../../api/client'
import { ReportsResponse, LocationReport, PeriodStats } from '../../types'

type Period = 'saptamanal' | 'lunar'

const PERIOD_LABELS: Record<Period, { cur: keyof LocationReport; prev: keyof LocationReport; label: string }> = {
  saptamanal: { cur: 'saptamanaCurenta', prev: 'saptamanaTrecuta', label: 'Saptamanal' },
  lunar:      { cur: 'lunaCurenta',      prev: 'lunaTrecuta',      label: 'Lunar'      },
}

function KpiCard({ label, value, index = 0 }: {
  label: string; value: string | number; index?: number
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}
      className="card p-4 flex flex-col">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </motion.div>
  )
}

export default function AdminRapoarte() {
  const [period, setPeriod] = useState<Period>('saptamanal')
  const [activeTab, setActiveTab] = useState<string>()

  const { data, isLoading } = useQuery<ReportsResponse>({
    queryKey: ['admin', 'overview'],
    queryFn: adminApi.overview,
  })

  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null

  const tabs = [...data.locatii.map(l => l.numeLocatie), 'TOTAL']
  const tab = activeTab ?? tabs[0]
  const tabIdx = tabs.indexOf(tab)
  const prevTab = () => setActiveTab(tabs[(tabIdx - 1 + tabs.length) % tabs.length])
  const nextTab = () => setActiveTab(tabs[(tabIdx + 1) % tabs.length])

  const periods: Period[] = ['saptamanal', 'lunar']
  const periodIdx = periods.indexOf(period)
  const prevPeriod = () => setPeriod(periods[(periodIdx - 1 + periods.length) % periods.length])
  const nextPeriod = () => setPeriod(periods[(periodIdx + 1) % periods.length])

  const r: LocationReport = data.reports[tab]
  if (!r) return null

  const { cur: curKey } = PERIOD_LABELS[period]
  const cur = r[curKey] as PeriodStats

  const paymentChart = [
    { name: 'CASH',     value: cur?.incasariTipPlata?.CASH     ?? 0 },
    { name: 'CARD',     value: cur?.incasariTipPlata?.CARD     ?? 0 },
    { name: 'CURS',     value: cur?.incasariTipPlata?.CURS     ?? 0 },
    { name: 'CONTRACT', value: cur?.incasariTipPlata?.CONTRACT ?? 0 },
    { name: 'PROTOCOL', value: cur?.incasariTipPlata?.PROTOCOL ?? 0 },
  ].filter(row => row.value > 0)

  const washerRows = Object.entries(cur?.spalariPerSpalator ?? {})
    .map(([name, spalari]) => ({
      name,
      spalari,
      comision: cur?.comisionPerSpalator?.[name] ?? 0,
    }))
    .sort((a, b) => b.spalari - a.spalari)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1">
          <button onClick={prevTab} className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[7rem] text-center">{tab}</span>
          <button onClick={nextTab} className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={prevPeriod} className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[6rem] text-center">{PERIOD_LABELS[period].label}</span>
          <button onClick={nextPeriod} className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <KpiCard index={0} label="Spalari" value={cur?.spalari ?? 0} />
        <KpiCard index={1} label="Incasari" value={`${(cur?.incasari ?? 0).toFixed(0)} RON`} />
        <KpiCard index={2} label="Masini" value={cur?.clientiNoi ?? 0} />
      </div>

      {/* Payment chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="card p-3 mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
          Incasari tip plata — {PERIOD_LABELS[period].label}
        </p>
        {paymentChart.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Nicio incasare in perioada selectata</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={paymentChart}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                cursor={false}
                formatter={(v: number) => [`${v.toFixed(0)} RON`, 'Incasari']}
              />
              <Bar
                dataKey="value"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                activeBar={{ fill: '#2563eb', filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.45))' }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Washer table */}
      {washerRows.length > 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Spalatori — {PERIOD_LABELS[period].label}</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Spalator</th>
                <th className="px-4 py-2 text-right">Spalari</th>
                <th className="px-4 py-2 text-right">Comision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {washerRows.map(w => (
                <tr key={w.name} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-2.5 font-medium">{w.name}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{w.spalari}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-brand">{w.comision.toFixed(0)} RON</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </motion.div>
      ) : (
        <div className="card p-8 text-center text-sm text-gray-400">
          Nicio activitate in perioada selectata
        </div>
      )}
    </div>
  )
}
