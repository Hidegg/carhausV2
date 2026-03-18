import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Database, HardDrive, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { devApi } from '../../api/client'
import { DevSystemResponse } from '../../types'

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

function formatBackupName(name: string) {
  // carhaus_backup_2025-01-15_10-30-00.db → 2025-01-15 10:30
  const match = name.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/)
  if (!match) return name
  return `${match[1]}  ${match[2].replace(/-/g, ':')}`
}

const TABLE_LABELS: Record<string, string> = {
  servicii: 'Servicii',
  clienti: 'Clienti',
  spalatori: 'Spalatori',
  locatii: 'Locatii',
  users: 'Utilizatori',
  preturi: 'Preturi / Servicii',
}

export default function DevSystem() {
  const qc = useQueryClient()
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const { data, isLoading, refetch } = useQuery<DevSystemResponse>({
    queryKey: ['dev', 'system'],
    queryFn: devApi.system,
    refetchInterval: 30_000,
  })

  const backupMutation = useMutation({
    mutationFn: devApi.backup,
    onSuccess: (res) => {
      setBackupMsg({ ok: true, text: res.message ?? 'Backup realizat' })
      qc.invalidateQueries({ queryKey: ['dev', 'system'] })
      setTimeout(() => setBackupMsg(null), 4000)
    },
    onError: () => {
      setBackupMsg({ ok: false, text: 'Backup esuat' })
      setTimeout(() => setBackupMsg(null), 4000)
    },
  })

  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>
  if (!data) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">System</h2>
        <button onClick={() => refetch()} className="p-2 text-gray-400 hover:text-brand transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw size={15} />
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-6">Stare baza de date si activitate recenta</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* DB counts */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="card p-4 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Database size={15} className="text-brand" />
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Baza de Date</h3>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {Object.entries(data.counts).map(([key, val]) => (
                <tr key={key}>
                  <td className="py-1.5 text-gray-500">{TABLE_LABELS[key] ?? key}</td>
                  <td className="py-1.5 text-right font-semibold">{val.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{data.env.dbType}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${data.env.debug ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                {data.env.debug ? 'DEBUG' : 'PRODUCTION'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">v{data.env.version}</p>
          </div>
        </motion.div>

        {/* Backups */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="card p-4 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive size={15} className="text-brand" />
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Backup-uri</h3>
          </div>

          {data.backups.length === 0 ? (
            <p className="text-sm text-gray-400">Niciun backup gasit</p>
          ) : (
            <ul className="space-y-1 mb-4">
              {data.backups.map((b, i) => (
                <li key={b} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className={`font-mono ${i === 0 ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-400'}`}>
                    {formatBackupName(b)}
                  </span>
                  {i === 0 && <span className="text-[10px] text-brand font-medium">latest</span>}
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
            className="w-full btn-primary flex items-center justify-center gap-2 mt-auto"
          >
            <HardDrive size={13} />
            {backupMutation.isPending ? 'Se salveaza...' : 'Backup acum'}
          </button>

          {backupMsg && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-2 flex items-center gap-1.5 text-xs ${backupMsg.ok ? 'text-green-600' : 'text-red-500'}`}
            >
              {backupMsg.ok
                ? <CheckCircle size={12} />
                : <AlertCircle size={12} />}
              {backupMsg.text}
            </motion.div>
          )}
        </motion.div>

        {/* Env */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="card p-4 lg:col-span-1 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Mediu</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Baza de date</span>
              <span className="font-medium">{data.env.dbType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Versiune app</span>
              <span className="font-mono font-medium">v{data.env.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Mod</span>
              <span className={`font-medium ${data.env.debug ? 'text-yellow-600' : 'text-green-600'}`}>
                {data.env.debug ? 'Debug' : 'Production'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent activity */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Activitate Recenta (ultimele 15 spalari)</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Data</th>
              <th className="px-4 py-2 text-left">Numar Auto</th>
              <th className="px-4 py-2 text-left">Serviciu</th>
              <th className="px-4 py-2 text-left">Locatie</th>
              <th className="px-4 py-2 text-center">Plata</th>
              <th className="px-4 py-2 text-right">Suma</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.recentServices.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">{formatDate(s.dataSpalare)}</td>
                <td className="px-4 py-2 font-mono font-semibold tracking-wide text-xs">{s.plate ?? '—'}</td>
                <td className="px-4 py-2">{s.serviciiPrestate}</td>
                <td className="px-4 py-2 text-gray-500">{s.locatie ?? '—'}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PLATA_COLORS[s.tipPlata] ?? ''}`}>
                    {s.tipPlata}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-medium">{s.pretServicii?.toFixed(0) ?? 0} RON</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  )
}
