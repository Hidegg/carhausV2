import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '../../api/client'
import { IstoricData } from '../../types'

export default function AdminIstoric() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<string>()

  const { data: settingsData } = useQuery<{ locatii: { id: number; numeLocatie: string }[] }>({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.settings,
  })

  const tabs = [...(settingsData?.locatii.map(l => l.numeLocatie) ?? []), 'TOTAL']
  const tab      = activeTab ?? tabs[0]
  const tabIdx   = tabs.indexOf(tab)
  const prevTab  = () => setActiveTab(tabs[(tabIdx - 1 + tabs.length) % tabs.length])
  const nextTab  = () => setActiveTab(tabs[(tabIdx + 1) % tabs.length])
  const locatieId = settingsData?.locatii.find(l => l.numeLocatie === tab)?.id

  const { data, isLoading } = useQuery<IstoricData>({
    queryKey: ['admin', 'istoric', locatieId, year, month],
    queryFn:  () => adminApi.istoric({ locatie_id: locatieId, year, month: month ?? undefined }),
    enabled:  tabs.length > 0,
    placeholderData: keepPreviousData,
  })

  if (isLoading && !data) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null

  const isAnnual  = data.view === 'annual'
  const currYear  = new Date().getFullYear()
  const minYear   = data.availableYears[0] ?? year

  const handleBarClick = (chartData: any) => {
    if (isAnnual && chartData?.activePayload?.[0]?.payload?.month) {
      setMonth(chartData.activePayload[0].payload.month)
    }
  }

  const prevMonth = () => {
    if (month === null) return
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m! - 1)
  }
  const nextMonth = () => {
    if (month === null) return
    const now = new Date()
    if (year === now.getFullYear() && month === now.getMonth() + 1) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m! + 1)
  }
  const isNextMonthDisabled = () => {
    const now = new Date()
    return year === now.getFullYear() && month === now.getMonth() + 1
  }

  const kpiCards = isAnnual
    ? [
        { label: `Incasari ${year}`, value: `${data.kpi.incasari.toFixed(0)} RON` },
        { label: 'Spalari',          value: data.kpi.spalari },
        { label: 'Masini',           value: data.kpi.masini },
        { label: 'Luna de varf',     value: data.kpi.lunaDeVarf ?? '—' },
      ]
    : [
        { label: 'Incasari', value: `${data.kpi.incasari.toFixed(0)} RON` },
        { label: 'Spalari',  value: data.kpi.spalari },
        { label: 'Masini',   value: data.kpi.masini },
      ]

  return (
    <div>
      {/* Control row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">

        {/* Location nav */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={prevTab} className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[7rem] text-center">{tab}</span>
          <button onClick={nextTab} className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Anual / Lunar nav */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => isAnnual ? setMonth(new Date().getMonth() + 1) : setMonth(null)}
            className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[4rem] text-center">{isAnnual ? 'Anual' : 'Lunar'}</span>
          <button onClick={() => isAnnual ? setMonth(new Date().getMonth() + 1) : setMonth(null)}
            className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Period navigator */}
        {isAnnual ? (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setYear(y => y - 1)} disabled={year <= minYear}
              className="p-1.5 rounded-lg card text-gray-500 hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-base font-bold px-2 tabular-nums w-14 text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)} disabled={year >= currYear}
              className="p-1.5 rounded-lg card text-gray-500 hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prevMonth} disabled={year <= minYear && month === 1}
              className="p-1.5 rounded-lg card text-gray-500 hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-base font-bold px-2 text-center w-36">{data.monthLabel}</span>
            <button onClick={nextMonth} disabled={isNextMonthDisabled()}
              className="p-1.5 rounded-lg card text-gray-500 hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        )}

      </div>

      {/* KPI cards */}
      <div className={`grid gap-3 mb-6 ${isAnnual ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3'}`}>
        {kpiCards.map(({ label, value }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="card p-4 flex flex-col">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue bar chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }} className="card p-4 mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">
          Incasari — {isAnnual ? year : data.monthLabel}
          {isAnnual && (
            <span className="ml-2 normal-case font-normal text-[11px] text-gray-400">
              tap luna pentru detalii
            </span>
          )}
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data.bars}
            margin={{ left: 0, right: 0 }}
            onClick={isAnnual ? handleBarClick : undefined}
            style={{ cursor: isAnnual ? 'pointer' : 'default' }}
          >
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <Tooltip
              cursor={false}
              formatter={(v: number) => [`${v.toFixed(0)} RON`, 'Incasari']}
            />
            <Bar dataKey="incasari" fill="#2563eb" radius={[4, 4, 0, 0]}
              activeBar={{ fill: '#2563eb', filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.45))' }} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Spalari line chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.26 }} className="card p-4 mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">
          Spalari — {isAnnual ? year : data.monthLabel}
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data.bars} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,163,175,0.15)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip cursor={false} formatter={(v: number) => [v, 'Spalari']} />
            <Line type="monotone" dataKey="spalari" stroke="#2563eb" strokeWidth={2} dot={false}
              activeDot={{ r: 4, fill: '#2563eb', filter: 'drop-shadow(0 0 4px rgba(37,99,235,0.6))' }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Service breakdown */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.34 }} className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Servicii — {isAnnual ? year : data.monthLabel}
          </p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Serviciu</th>
              <th className="px-4 py-2 text-right">Spalari</th>
              <th className="px-4 py-2 text-right">Incasari</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.serviciiBreakdown.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">Nicio date</td>
              </tr>
            ) : data.serviciiBreakdown.map(s => (
              <tr key={s.name} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-2.5 font-medium">{s.name}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{s.spalari}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-brand">{s.incasari.toFixed(0)} RON</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </motion.div>
    </div>
  )
}
