import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react'
import { devApi } from '../../api/client'
import { DevClientsResponse, DevClientHistory } from '../../types'

const PLATA_COLORS: Record<string, string> = {
  CASH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CARD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CURS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONTRACT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PROTOCOL: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function HistoryRow({ plate }: { plate: string }) {
  const { data, isLoading } = useQuery<DevClientHistory>({
    queryKey: ['dev', 'client-history', plate],
    queryFn: () => devApi.clientHistory(plate),
  })

  if (isLoading) return (
    <tr><td colSpan={8} className="px-4 py-4 text-center text-gray-400 text-sm">Se incarca...</td></tr>
  )
  if (!data) return null

  return (
    <>
      <tr className="bg-gray-50 dark:bg-[#161616]">
        <td colSpan={8} className="px-6 py-3">
          <div className="flex gap-6 text-xs text-gray-500">
            {data.client.emailClient && <span>✉ {data.client.emailClient}</span>}
            {data.client.telefonClient && <span>📞 {data.client.telefonClient}</span>}
            <span className={`flex items-center gap-1 ${data.client.gdpr ? 'text-green-600' : 'text-red-400'}`}>
              {data.client.gdpr ? <CheckCircle size={12} /> : <XCircle size={12} />} GDPR
            </span>
            <span className={`flex items-center gap-1 ${data.client.newsletter ? 'text-green-600' : 'text-red-400'}`}>
              {data.client.newsletter ? <CheckCircle size={12} /> : <XCircle size={12} />} Newsletter
            </span>
          </div>
        </td>
      </tr>
      {data.servicii.length === 0 ? (
        <tr className="bg-gray-50/50 dark:bg-[#161616]">
          <td colSpan={8} className="px-6 py-3 text-center text-xs text-gray-400">Niciun serviciu inregistrat</td>
        </tr>
      ) : (
        data.servicii.map(s => (
          <tr key={s.id} className="bg-gray-50/50 dark:bg-[#161616] text-xs border-b border-gray-100 dark:border-gray-800">
            <td className="px-6 py-2 text-gray-400" colSpan={2}>{formatDate(s.dataSpalare)}</td>
            <td className="px-4 py-2 font-medium">{s.serviciiPrestate}</td>
            <td className="px-4 py-2">{s.spalator ?? '—'}</td>
            <td className="px-4 py-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PLATA_COLORS[s.tipPlata] ?? ''}`}>
                {s.tipPlata}
              </span>
            </td>
            <td className="px-4 py-2 text-right font-medium">{s.pretServicii?.toFixed(0) ?? 0} RON</td>
            <td className="px-4 py-2 text-right text-brand">{s.comisionServicii?.toFixed(0) ?? 0} RON</td>
            <td className="px-4 py-2 text-gray-400">{s.nrFirma ?? ''}</td>
          </tr>
        ))
      )}
    </>
  )
}

export default function DevClients() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery<DevClientsResponse>({
    queryKey: ['dev', 'clients', query, page],
    queryFn: () => devApi.clients(query, page),
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setQuery(search)
    setPage(1)
    setExpanded(null)
  }

  function toggleRow(plate: string) {
    setExpanded(prev => prev === plate ? null : plate)
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Clienti</h2>
      <p className="text-sm text-gray-400 mb-6">Toate autoturismele inregistrate in sistem</p>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value.toUpperCase())}
            placeholder="Cauta dupa numar auto..."
            className="form-input pl-8"
          />
        </div>
        <button type="submit" className="btn-primary">Cauta</button>
        {query && (
          <button type="button" onClick={() => { setSearch(''); setQuery(''); setPage(1) }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Reset
          </button>
        )}
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {isLoading ? 'Se incarca...' : `${data?.total ?? 0} clienti`}
          </span>
          {data && data.pages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:border-brand transition-colors">
                ←
              </button>
              <span className="text-gray-500">{page} / {data.pages}</span>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:border-brand transition-colors">
                →
              </button>
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Numar Auto</th>
              <th className="px-4 py-2 text-left">Marca / Tip</th>
              <th className="px-4 py-2 text-left">Locatie</th>
              <th className="px-4 py-2 text-right">Spalari</th>
              <th className="px-4 py-2 text-left">Ultima Spalare</th>
              <th className="px-4 py-2 text-center">GDPR</th>
              <th className="px-4 py-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Se incarca...</td></tr>
            )}
            {!isLoading && data?.clients.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Niciun client gasit</td></tr>
            )}
            {data?.clients.map(c => (
              <>
                <tr
                  key={c.numarAutoturism}
                  onClick={() => toggleRow(c.numarAutoturism)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono font-semibold tracking-wide">{c.numarAutoturism}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{c.marcaAutoturism || '—'}</span>
                    {c.tipAutoturism && (
                      <span className="ml-2 text-xs text-gray-400">{c.tipAutoturism}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{c.locatie ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{c.totalServicii}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                    {c.ultimaSpalare ? formatDate(c.ultimaSpalare) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {c.gdpr
                      ? <CheckCircle size={14} className="inline text-green-500" />
                      : <XCircle size={14} className="inline text-red-400" />}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">
                    {expanded === c.numarAutoturism
                      ? <ChevronUp size={14} />
                      : <ChevronDown size={14} />}
                  </td>
                </tr>
                <AnimatePresence>
                  {expanded === c.numarAutoturism && (
                    <HistoryRow plate={c.numarAutoturism} />
                  )}
                </AnimatePresence>
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
