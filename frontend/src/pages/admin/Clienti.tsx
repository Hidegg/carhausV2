import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Tag, X } from 'lucide-react'
import { adminApi } from '../../api/client'
import { AdminClientiResponse } from '../../types'
import BrandPicker from '../../components/BrandPicker'

type Sort = 'vizite' | 'total' | 'data'

const SORT_LABELS: Record<Sort, string> = {
  vizite: 'Frecventa',
  total:  'Total cheltuit',
  data:   'Ultima vizita',
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminClienti() {
  const navigate = useNavigate()
  const [sort, setSort] = useState<Sort>('vizite')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [q, setQ] = useState('')
  const [brand, setBrand] = useState('')
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
    queryKey: ['admin', 'clienti', locatieId, sort, dir, q, brand],
    queryFn: () => adminApi.clienti({ locatie_id: locatieId, sort, dir, q: q || undefined, brand: brand || undefined }),
    enabled: tabs.length > 0,
    placeholderData: keepPreviousData,
  })

  const clienti = data?.clienti ?? []

  function handleSort(s: Sort) {
    if (s === sort) setDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSort(s); setDir('desc') }
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
        {/* Location nav */}
        <div className="flex items-center gap-1">
          <button onClick={prevTab} className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[7rem] text-center">{tab}</span>
          <button onClick={nextTab} className="p-1.5 rounded-lg card text-gray-500 hover:text-brand transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Search + brand */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Numar..."
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] outline-none focus:border-brand w-36"
            />
          </div>

          {brand ? (
            <button onClick={() => setBrand('')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand text-white">
              {brand}
              <X size={13} />
            </button>
          ) : (
            <button onClick={() => setShowBrandPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg card text-sm font-medium text-gray-500 hover:text-brand transition-colors">
              <Tag size={14} />
              Brand
            </button>
          )}
        </div>
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
                <th className="px-4 py-3 text-right">Vizite</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Top serviciu</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Ultima vizita</th>
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
                  <td className="px-4 py-3 text-right font-bold">{c.vizite}</td>
                  <td className="px-4 py-3 text-right font-semibold text-brand">{c.total.toFixed(0)} RON</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500 hidden sm:table-cell">
                    {c.topServiciu ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400 hidden sm:table-cell">
                    {fmt(c.ultimaSpalare)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </motion.div>

      {/* Brand picker modal */}
      {showBrandPicker && (
        <BrandPicker
          onSelect={name => { setBrand(name.toUpperCase()); setShowBrandPicker(false) }}
          onClose={() => setShowBrandPicker(false)}
        />
      )}
    </div>
  )
}
