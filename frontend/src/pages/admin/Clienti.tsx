import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Tag, X, Download } from 'lucide-react'
import { adminApi } from '../../api/client'
import { AdminClientiResponse, CursPendingItem } from '../../types'
import BrandPicker from '../../components/BrandPicker'

type Sort = 'vizite' | 'total' | 'data'
type MainTab = 'clienti' | 'curs'

const SORT_LABELS: Record<Sort, string> = {
  vizite: 'Frecventa',
  total:  'Total',
  data:   'Data',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysSince(iso: string | null): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function urgencyClass(iso: string | null): string {
  const days = daysSince(iso)
  if (days > 30) return 'bg-red-50 dark:bg-red-900/10'
  if (days > 7)  return 'bg-yellow-50 dark:bg-yellow-900/10'
  return ''
}

function urgencyBadge(iso: string | null) {
  const days = daysSince(iso)
  if (days > 30) return <span className="text-xs font-semibold text-red-500">{days}z</span>
  if (days > 7)  return <span className="text-xs font-semibold text-yellow-500">{days}z</span>
  return <span className="text-xs text-gray-400">{days}z</span>
}

function downloadCsv(filename: string, rows: string[][], headers: string[]) {
  const lines = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminClienti() {
  const navigate = useNavigate()
  const [mainTab, setMainTab] = useState<MainTab>('clienti')
  const [sort, setSort] = useState<Sort>('vizite')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [q, setQ] = useState('')
  const [brands, setBrands] = useState<string[]>([])
  const [showBrandPicker, setShowBrandPicker] = useState(false)
  const [activeTab, setActiveTab] = useState<string>()

  const { data: settingsData } = useQuery<{ locatii: { id: number; numeLocatie: string }[] }>({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.settings,
  })

  const tabs = [...(settingsData?.locatii.map(l => l.numeLocatie) ?? []), 'TOTAL']
  const tab = activeTab ?? tabs[0]
  const tabIdx = tabs.indexOf(tab)
  const prevTab = () => setActiveTab(tabs[(tabIdx - 1 + tabs.length) % tabs.length])
  const nextTab = () => setActiveTab(tabs[(tabIdx + 1) % tabs.length])
  const locatieId = settingsData?.locatii.find(l => l.numeLocatie === tab)?.id

  const { data, isLoading } = useQuery<AdminClientiResponse>({
    queryKey: ['admin', 'clienti', locatieId, sort, dir, q, brands],
    queryFn: () => adminApi.clienti({ locatie_id: locatieId, sort, dir, q: q || undefined, brand: brands.length ? brands.join(',') : undefined }),
    enabled: tabs.length > 0 && mainTab === 'clienti',
    placeholderData: keepPreviousData,
  })

  const { data: cursData = [], isLoading: cursLoading } = useQuery<CursPendingItem[]>({
    queryKey: ['admin', 'curs-pending', locatieId],
    queryFn: () => adminApi.cursPending(locatieId),
    enabled: mainTab === 'curs' && tabs.length > 0,
  })

  const clienti = data?.clienti ?? []

  function handleSort(s: Sort) {
    if (s === sort) setDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSort(s); setDir('desc') }
  }

  function exportClientsCsv() {
    downloadCsv('clienti.csv',
      clienti.map(c => [c.numar, c.marca, c.tip, String(c.vizite), c.total.toFixed(0), c.topServiciu ?? '', fmt(c.ultimaSpalare)]),
      ['Numar', 'Marca', 'Tip', 'Vizite', 'Total RON', 'Top Serviciu', 'Ultima Vizita']
    )
  }

  function exportCursCsv() {
    downloadCsv('curs-neplatit.csv',
      cursData.map(c => [c.numar, c.marca, c.tip, String(c.curs_count), c.curs_total.toFixed(0), fmt(c.ultima_data)]),
      ['Numar', 'Marca', 'Tip', 'Nr Servicii CURS', 'Total CURS RON', 'Ultima Data']
    )
  }

  return (
    <div>
      {/* Main tabs */}
      <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 mb-4">
        {([['clienti', 'Clienti'], ['curs', 'Curs Neplatit']] as [MainTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setMainTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              mainTab === key ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-brand'
            }`}>
            {label}
            {key === 'curs' && cursData.length > 0 && (
              <span className="ml-1.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded-full">
                {cursData.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Location nav (shared) */}
      <div className="flex items-center gap-1 mb-4 shrink-0">
        <button onClick={prevTab} className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold min-w-[5rem] text-center">{tab}</span>
        <button onClick={nextTab} className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {mainTab === 'clienti' && (
        <>
          {/* Controls */}
          <div className="flex gap-2 items-center justify-between mb-4">
            {/* Search + brand */}
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Numar..."
                  className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] outline-none focus:border-brand w-24"
                />
              </div>

              {brands.length > 0 ? (
                <button onClick={() => setShowBrandPicker(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand text-white">
                  <Tag size={14} />
                  {brands.length === 1 ? brands[0] : `${brands[0]} +${brands.length - 1}`}
                  <span onClick={e => { e.stopPropagation(); setBrands([]) }}
                    className="ml-0.5 opacity-80 hover:opacity-100">
                    <X size={13} />
                  </span>
                </button>
              ) : (
                <button onClick={() => setShowBrandPicker(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg card text-sm font-medium text-gray-500 hover:text-brand transition-colors">
                  <Tag size={14} />
                  Brand
                </button>
              )}
            </div>

            <button onClick={exportClientsCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg card text-sm font-medium text-gray-500 hover:text-brand transition-colors shrink-0">
              <Download size={14} />
              CSV
            </button>
          </div>

          {/* Sort row */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 w-fit">
            {(Object.keys(SORT_LABELS) as Sort[]).map(s => (
              <button key={s} onClick={() => handleSort(s)}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  sort === s
                    ? 'bg-white dark:bg-[#1f1f1f] text-brand shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {SORT_LABELS[s]}
                {sort === s && (dir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
              </button>
            ))}
          </div>

          {/* Stats row */}
          {data && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Clienti', value: data.total },
                { label: 'Vizite totale', value: clienti.reduce((s, c) => s + c.vizite, 0) },
                { label: 'Venit total', value: `${clienti.reduce((s, c) => s + c.total, 0).toFixed(0)} RON` },
              ].map(({ label, value }, i) => (
                <motion.div key={label}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="card p-4 flex flex-col">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="card overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-gray-400 text-sm">Se incarca...</div>
            ) : clienti.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">Niciun client gasit</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Masina</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Contact</th>
                    <th className="px-4 py-3 text-right">Vizite</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap w-28">Total</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Top serviciu</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell whitespace-nowrap w-32">Ultima vizita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {clienti.map((c, i) => (
                    <tr key={c.id}
                      onClick={() => navigate(`/admin/clienti/${c.numar}`)}
                      className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03] cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}</span>
                          <div>
                            <span className="font-mono font-semibold tracking-wide">{c.numar}</span>
                            <span className="text-xs text-gray-400 ml-2">{c.marca} · {c.tip}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                        {c.telefon ?? c.email ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{c.vizite}</td>
                      <td className="px-4 py-3 text-right font-semibold text-brand whitespace-nowrap">{c.total.toFixed(0)} RON</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500 hidden sm:table-cell">
                        {c.topServiciu ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 hidden sm:table-cell whitespace-nowrap">
                        {fmt(c.ultimaSpalare)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </motion.div>
        </>
      )}

      {mainTab === 'curs' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Clienti cu plata CURS in asteptare
              </span>
              {cursData.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  — Total: <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    {cursData.reduce((s, c) => s + c.curs_total, 0).toFixed(0)} RON
                  </span>
                </span>
              )}
            </div>
            {cursData.length > 0 && (
              <button onClick={exportCursCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg card text-sm font-medium text-gray-500 hover:text-brand transition-colors">
                <Download size={14} />
                CSV
              </button>
            )}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
            {cursLoading ? (
              <div className="py-16 text-center text-gray-400 text-sm">Se incarca...</div>
            ) : cursData.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">Nicio plata CURS in asteptare</div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Masina</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Contact</th>
                    <th className="px-4 py-3 text-right">Nr. Servicii</th>
                    <th className="px-4 py-3 text-right">Total CURS</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Ultima Data</th>
                    <th className="px-4 py-3 text-right hidden sm:table-cell">Vechime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {cursData.map((c, i) => (
                    <tr key={c.numar}
                      onClick={() => navigate(`/admin/clienti/${c.numar}`)}
                      className={`cursor-pointer transition-colors hover:brightness-95 ${urgencyClass(c.ultima_data)}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}</span>
                          <div>
                            <span className="font-mono font-semibold tracking-wide">{c.numar}</span>
                            <span className="text-xs text-gray-400 ml-2">{c.marca} · {c.tip}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                        {c.telefon ?? c.email ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{c.curs_count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                        {c.curs_total.toFixed(0)} RON
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 hidden sm:table-cell whitespace-nowrap">
                        {fmt(c.ultima_data)}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        {urgencyBadge(c.ultima_data)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Brand picker modal */}
      {showBrandPicker && (
        <BrandPicker
          selected={brands}
          onConfirm={names => setBrands(names)}
          onClose={() => setShowBrandPicker(false)}
        />
      )}
    </div>
  )
}
