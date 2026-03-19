import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '../../api/client'
import { ReportsResponse, LocationReport, PeriodStats } from '../../types'

type Period = 'azi' | 'saptamana' | 'luna'

const PERIOD_MAP: Record<Period, keyof LocationReport> = {
  azi:       'ziuaCurenta',
  saptamana: 'saptamanaCurenta',
  luna:      'lunaCurenta',
}

const PERIOD_LABELS: Record<Period, string> = {
  azi: 'Azi', saptamana: 'Saptamana', luna: 'Luna'
}

export default function AdminSpalatori() {
  const [period, setPeriod] = useState<Period>('azi')
  const [activeTab, setActiveTab] = useState<string>()

  // Stats data (spalariPerSpalator only has washers who have actual services)
  const { data: statsData, isLoading: statsLoading } = useQuery<ReportsResponse>({
    queryKey: ['admin', 'spalatori'],
    queryFn: adminApi.spalatori,
  })

  // Settings data (full list of all spalatori, even those with no services)
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.settings,
  })

  if (statsLoading || settingsLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!statsData || !settingsData) return null

  const tabs = [...statsData.locatii.map((l: { numeLocatie: string }) => l.numeLocatie), 'TOTAL']
  const tab = activeTab ?? tabs[0]
  const r: LocationReport = statsData.reports[tab]

  const periodKey = PERIOD_MAP[period]
  const stats = (r?.[periodKey] ?? {}) as PeriodStats

  // Build the full spalator list for this tab
  // For a specific location: use the settings list for that location
  // For TOTAL: union of all locations' spalatori
  let allNames: string[] = []

  if (tab === 'TOTAL') {
    allNames = settingsData.locatii.flatMap((l: { spalatori?: { numeSpalator: string }[] }) =>
      (l.spalatori ?? []).map((s: { numeSpalator: string }) => s.numeSpalator)
    )
  } else {
    const loc = settingsData.locatii.find((l: { numeLocatie: string }) => l.numeLocatie === tab)
    allNames = (loc?.spalatori ?? []).map((s: { numeSpalator: string }) => s.numeSpalator)
  }

  // De-duplicate (names are unique per location but could theoretically repeat)
  allNames = [...new Set(allNames)]

  // Merge: for each name from DB, get stats (default 0 if no activity)
  const rows = allNames.map(name => ({
    name,
    spalari: stats?.spalariPerSpalator?.[name] ?? 0,
    comision: stats?.comisionPerSpalator?.[name] ?? 0,
    incasari: (() => {
      // Approximate incasari from the service type breakdown isn't available per-washer
      // Commission is stored directly, so we show that
      return stats?.comisionPerSpalator?.[name] ?? 0
    })(),
  })).sort((a, b) => b.spalari - a.spalari)

  const totalSpalari = rows.reduce((s, r) => s + r.spalari, 0)
  const totalComision = rows.reduce((s, r) => s + r.comision, 0)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold">Spalatori</h2>
          <p className="text-sm text-gray-400">Performanta echipei</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Period toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {(['azi', 'saptamana', 'luna'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-white dark:bg-[#1f1f1f] text-brand shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          {/* Location tabs */}
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

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Spalator</th>
              <th className="px-4 py-3 text-right">Spalari</th>
              <th className="px-4 py-3 text-right">Comision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Niciun spalator in aceasta locatie
                </td>
              </tr>
            )}
            {rows.map(w => (
              <tr key={w.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {w.spalari > 0 ? w.spalari : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-brand">
                  {w.comision > 0 ? `${w.comision.toFixed(0)} RON` : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right">{totalSpalari}</td>
                <td className="px-4 py-2.5 text-right text-brand">{totalComision.toFixed(0)} RON</td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </motion.div>
    </div>
  )
}
