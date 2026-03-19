import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { adminApi } from '../../api/client'

const PLATA_COLORS: Record<string, string> = {
  CASH:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CARD:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CURS:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONTRACT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PROTOCOL: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminClientDetail() {
  const { plate } = useParams<{ plate: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'clientHistory', plate],
    queryFn: () => adminApi.clientHistory(plate!),
    enabled: !!plate,
  })

  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null

  const { client, history } = data
  const total = history.filter((s: any) => s.tipPlata !== 'CURS').reduce((sum: number, s: any) => sum + s.pret, 0)

  return (
    <div>
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand transition-colors mb-6">
        <ArrowLeft size={16} />
        Inapoi
      </button>

      {/* Client header */}
      <div className="card p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono font-bold text-2xl tracking-widest">{client.numar}</p>
            <p className="text-sm text-gray-500 mt-1">{client.marca} · {client.tip}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total incasat</p>
            <p className="text-xl font-bold text-brand">{total.toFixed(0)} RON</p>
            <p className="text-xs text-gray-400 mt-0.5">{history.length} servicii</p>
          </div>
        </div>
      </div>

      {/* History */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Istoric servicii</p>
        </div>
        {history.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Niciun serviciu</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {history.map((s: any, i: number) => (
              <motion.div key={s.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.serviciu}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(s.data)}{s.nrFirma ? ` · ${s.nrFirma}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATA_COLORS[s.tipPlata] ?? ''}`}>
                    {s.tipPlata}
                  </span>
                  <span className="text-sm font-semibold text-brand w-20 text-right">{s.pret.toFixed(0)} RON</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
