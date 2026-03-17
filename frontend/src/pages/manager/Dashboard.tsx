import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { managerApi } from '../../api/client'
import { ClientCard } from '../../types'
import { Car } from 'lucide-react'
import { Link } from 'react-router-dom'
import brandsData from '../../data/carBrands.json'

const brandLogoByName: Record<string, string> = {}
for (const b of brandsData as Array<{ name: string; image?: { thumb?: string } }>) {
  if (b.image?.thumb) brandLogoByName[b.name.toLowerCase()] = b.image.thumb
}


export default function ManagerDashboard() {
  const [firmaInput, setFirmaInput] = useState<{id: number; tipPlata: string} | null>(null)
  const [firmaValue, setFirmaValue] = useState('')
  const qc = useQueryClient()
  const { data: cards = [], isLoading } = useQuery<ClientCard[]>({
    queryKey: ['manager', 'dashboard'],
    queryFn: managerApi.dashboard,
    refetchInterval: 30_000,
  })

  const updatePayment = useMutation({
    mutationFn: ({ id, tipPlata, nrFirma }: { id: number; tipPlata: string; nrFirma?: string }) =>
      managerApi.updatePayment(id, tipPlata, nrFirma),
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
      <h2 className="text-xl font-bold mb-6">Spalari Azi</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div key={card.client.numarAutoturism}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card overflow-hidden">
            <div className="bg-brand px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-white text-sm tracking-wide min-w-0">
                <span className="shrink-0">{card.client.numarAutoturism}</span>
                {card.client.marcaAutoturism && <>
                  <span className="text-white/40">·</span>
                  <span className="truncate">{card.client.marcaAutoturism}</span>
                </>}
                {card.client.tipAutoturism && <>
                  <span className="text-white/40">·</span>
                  <span className="shrink-0">{card.client.tipAutoturism}</span>
                </>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-white/90 text-xs font-semibold">{card.servicii[0]?.spalator}</div>
              </div>
            </div>
            <div className="flex">
              {/* Logo column */}
              <div className="w-20 shrink-0 flex items-center justify-center p-1.5 border-r border-gray-100 dark:border-gray-800">
                {brandLogoByName[card.client.marcaAutoturism?.toLowerCase()] ? (
                  <img
                    src={brandLogoByName[card.client.marcaAutoturism.toLowerCase()]}
                    alt={card.client.marcaAutoturism}
                    className="w-12 h-12 object-contain"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <span className="text-3xl font-bold text-gray-200 dark:text-gray-700">
                    {card.client.marcaAutoturism?.charAt(0)}
                  </span>
                )}
              </div>

              {/* Services column */}
              <div className="flex-1 divide-y divide-gray-100 dark:divide-gray-800">
                {card.servicii.map(s => (
                  <div key={s.id} className="px-4 pt-2 pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-semibold">{s.serviciiPrestate}</div>
                        <div className="text-[13px] text-gray-400 mt-1">{new Date(s.dataSpalare).toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-sm font-bold text-brand">{s.pretServicii} RON</div>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                      {s.tipPlata === 'CASH' && (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">CASH</span>
                      )}
                      {s.tipPlata === 'CARD' && (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">CARD</span>
                      )}
                      {s.tipPlata === 'CURS' && (
                        <>
                          <span className="text-xs px-2 py-0.5 rounded font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">CURS</span>
                          {firmaInput?.id === s.id ? (
                            <div className="flex items-center gap-1">
                              <input autoFocus value={firmaValue} onChange={e => setFirmaValue(e.target.value)}
                                placeholder="Nr. Firma"
                                className="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f1f1f] w-28 outline-none focus:border-brand"
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && firmaValue.trim()) {
                                    updatePayment.mutate({ id: s.id, tipPlata: firmaInput.tipPlata, nrFirma: firmaValue.trim() })
                                    setFirmaInput(null); setFirmaValue('')
                                  }
                                  if (e.key === 'Escape') { setFirmaInput(null); setFirmaValue('') }
                                }} />
                              <button type="button" onClick={() => {
                                if (firmaValue.trim()) {
                                  updatePayment.mutate({ id: s.id, tipPlata: firmaInput.tipPlata, nrFirma: firmaValue.trim() })
                                  setFirmaInput(null); setFirmaValue('')
                                }
                              }} className="text-xs px-2 py-0.5 rounded bg-brand text-white font-medium">OK</button>
                              <button type="button" onClick={() => { setFirmaInput(null); setFirmaValue('') }}
                                className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs text-gray-400">Plata:</span>
                              {['CASH', 'CARD'].map(opt => (
                                <button key={opt} type="button"
                                  onClick={() => updatePayment.mutate({ id: s.id, tipPlata: opt })}
                                  className="text-xs px-2 py-0.5 rounded font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand hover:text-brand transition-colors">
                                  {opt}
                                </button>
                              ))}
                              {['CONTRACT', 'PROTOCOL'].map(opt => (
                                <button key={opt} type="button"
                                  onClick={() => { setFirmaInput({ id: s.id, tipPlata: opt }); setFirmaValue('') }}
                                  className={`text-xs px-2 py-0.5 rounded font-medium border transition-colors ${
                                    opt === 'CONTRACT'
                                      ? 'border-purple-300 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                      : 'border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                  }`}>
                                  {opt}
                                </button>
                              ))}
                            </>
                          )}
                        </>
                      )}
                      {s.tipPlata === 'CONTRACT' && (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          CONTRACT{s.nrFirma ? ` · ${s.nrFirma}` : ''}
                        </span>
                      )}
                      {s.tipPlata === 'PROTOCOL' && (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          PROTOCOL{s.nrFirma ? ` · ${s.nrFirma}` : ''}
                        </span>
                      )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
