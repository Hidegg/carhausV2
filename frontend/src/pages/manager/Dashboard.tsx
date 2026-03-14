import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { managerApi } from '../../api/client'
import { ClientCard } from '../../types'
import { Car } from 'lucide-react'
import { Link } from 'react-router-dom'

const PLATA_COLORS: Record<string, string> = {
  CASH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CARD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CURS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
}

export default function ManagerDashboard() {
  const qc = useQueryClient()
  const { data: cards = [], isLoading } = useQuery<ClientCard[]>({
    queryKey: ['manager', 'dashboard'],
    queryFn: managerApi.dashboard,
    refetchInterval: 30_000,
  })

  const updatePayment = useMutation({
    mutationFn: ({ id, tipPlata }: { id: number; tipPlata: string }) =>
      managerApi.updatePayment(id, tipPlata),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manager', 'dashboard'] }),
  })

  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>

  if (cards.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <Car size={56} className="mb-4 opacity-30" />
      <p className="text-lg font-medium">Nicio spalare inregistrata azi.</p>
      <Link to="/manager/form" className="mt-3 text-sm text-brand hover:underline">
        Adauga primul serviciu
      </Link>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Spalari Azi</h2>
        <span className="text-sm text-gray-400">{cards.length} masini</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div key={card.client.numarAutoturism}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card overflow-hidden">
            <div className="bg-brand px-4 py-3 flex items-center justify-between">
              <span className="text-white font-bold tracking-wider text-sm">
                {card.client.numarAutoturism}
              </span>
              <span className="text-white/80 text-xs">
                {card.client.marcaAutoturism} · {card.client.tipAutoturism}
              </span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {card.servicii.map(s => (
                <div key={s.id} className="px-4 py-3 text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold">{s.serviciiPrestate}</span>
                    <span className="font-bold text-brand ml-2">{s.pretServicii} RON</span>
                  </div>
                  <div className="text-xs text-gray-400 space-y-0.5 mb-2">
                    <div>{new Date(s.dataSpalare).toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })} · {s.spalator}</div>
                    <div>Comision: {s.comisionServicii} RON</div>
                  </div>
                  {s.tipPlata === 'CURS' ? (
                    <div className="flex items-center gap-2">
                      <select
                        defaultValue=""
                        onChange={e => e.target.value && updatePayment.mutate({ id: s.id, tipPlata: e.target.value })}
                        className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-brand"
                      >
                        <option value="" disabled>Update plata...</option>
                        <option value="CASH">CASH</option>
                        <option value="CARD">CARD</option>
                      </select>
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">CURS</span>
                    </div>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${PLATA_COLORS[s.tipPlata] || ''}`}>
                      {s.tipPlata}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
