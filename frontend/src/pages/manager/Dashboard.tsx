import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { managerApi } from '../../api/client'
import { ClientCard, Serviciu, PretServicii, Spalator } from '../../types'
import { Car, Pencil, X, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import brandsData from '../../data/carBrands.json'

const brandLogoByName: Record<string, string> = {}
for (const b of brandsData as Array<{ name: string; image?: { thumb?: string } }>) {
  if (b.image?.thumb) brandLogoByName[b.name.toLowerCase()] = b.image.thumb
}

interface EditModal {
  serviciu: Serviciu
  plate: string
}

function EditModal({ modal, onClose, formData }: {
  modal: EditModal
  onClose: () => void
  formData: { preturi: PretServicii[]; spalatori: Spalator[] } | undefined
}) {
  const qc = useQueryClient()
  const s = modal.serviciu
  const [serviciiPrestate, setServiciiPrestate] = useState(s.serviciiPrestate)
  const [spalator, setSpalator] = useState(s.spalator ?? '')
  const [tipPlata, setTipPlata] = useState(s.tipPlata)
  const [nrFirma, setNrFirma] = useState(s.nrFirma ?? '')
  const [notite, setNotite] = useState(s.notite ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['manager', 'dashboard'] })

  const editMutation = useMutation({
    mutationFn: () => managerApi.editServiciu(s.id, { serviciiPrestate, spalator, tipPlata, nrFirma: nrFirma || null, notite: notite || null }),
    onSuccess: () => { invalidate(); onClose() },
  })

  const deleteMutation = useMutation({
    mutationFn: () => managerApi.deleteServiciu(s.id),
    onSuccess: () => { invalidate(); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-md p-5 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">Editeaza Serviciu</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div>
          <label className="form-label">Serviciu</label>
          <select value={serviciiPrestate} onChange={e => setServiciiPrestate(e.target.value)} className="form-input">
            {formData?.preturi.map((p: PretServicii) => (
              <option key={p.id} value={p.serviciiPrestate}>{p.serviciiPrestate}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Spalator</label>
          <select value={spalator} onChange={e => setSpalator(e.target.value)} className="form-input">
            {formData?.spalatori.map((sp: Spalator) => (
              <option key={sp.id} value={sp.numeSpalator}>{sp.numeSpalator}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Tip Plata</label>
          <div className="flex gap-1 flex-wrap">
            {['CASH', 'CARD', 'CURS', 'CONTRACT', 'PROTOCOL'].map(t => (
              <button key={t} type="button" onClick={() => setTipPlata(t as Serviciu['tipPlata'])}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                  tipPlata === t ? 'bg-brand text-white border-brand' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                {t}
              </button>
            ))}
          </div>
          {(tipPlata === 'CONTRACT' || tipPlata === 'PROTOCOL') && (
            <input type="text" value={nrFirma} onChange={e => setNrFirma(e.target.value)}
              placeholder="Nr. Firma" className="form-input mt-2" />
          )}
        </div>

        <div>
          <label className="form-label">Notite</label>
          <textarea value={notite} onChange={e => setNotite(e.target.value)}
            rows={2} placeholder="Observatii..." className="form-input resize-none" />
        </div>

        <div className="flex justify-between pt-2">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500">Confirmi stergerea?</span>
              <button onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 text-xs rounded bg-red-500 text-white font-medium hover:bg-red-600">
                Da, sterge
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs rounded border text-gray-500">
                Anuleaza
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="px-3 py-1.5 text-xs rounded border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium">
              Sterge
            </button>
          )}
          <button onClick={() => editMutation.mutate()}
            disabled={editMutation.isPending}
            className="btn-primary px-5 py-1.5 text-sm">
            {editMutation.isPending ? '...' : 'Salveaza'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function ManagerDashboard() {
  const [firmaInput, setFirmaInput] = useState<{id: number; tipPlata: string} | null>(null)
  const [firmaValue, setFirmaValue] = useState('')
  const [search, setSearch] = useState('')
  const [editModal, setEditModal] = useState<EditModal | null>(null)
  const qc = useQueryClient()

  const { data: cards = [], isLoading } = useQuery<ClientCard[]>({
    queryKey: ['manager', 'dashboard'],
    queryFn: managerApi.dashboard,
    refetchInterval: 30_000,
  })

  const { data: formData } = useQuery({
    queryKey: ['form-data'],
    queryFn: managerApi.formData,
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

  const filtered = search
    ? cards.filter(c => c.client.numarAutoturism.includes(search.toUpperCase()))
    : cards

  const cursCards = filtered.filter(c => c.servicii.some(s => s.tipPlata === 'CURS'))
  const paidCards = filtered.filter(c => c.servicii.every(s => s.tipPlata !== 'CURS'))

  const renderCard = (card: ClientCard, i: number) => {
    const hasCurs = card.servicii.some(s => s.tipPlata === 'CURS')
    return (
      <motion.div key={card.client.numarAutoturism}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className={`card overflow-hidden ${hasCurs ? 'border-l-4 border-l-yellow-400' : ''}`}>
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="text-sm font-semibold">{s.serviciiPrestate}</div>
                      <button type="button"
                        onClick={() => setEditModal({ serviciu: s, plate: card.client.numarAutoturism })}
                        className="text-gray-300 hover:text-brand transition-colors shrink-0">
                        <Pencil size={12} />
                      </button>
                    </div>
                    <div className="text-[13px] text-gray-400 mt-0.5">{new Date(s.dataSpalare).toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })}</div>
                    {s.notite && <div className="text-[11px] text-gray-400 italic mt-0.5 truncate max-w-[160px]">{s.notite}</div>}
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <div className="text-sm font-bold text-brand">{s.pretServicii} RON</div>
                    <div className="flex items-center justify-end gap-1.5 mt-1 flex-wrap">
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
    )
  }

  return (
    <div>
      {editModal && (
        <EditModal modal={editModal} onClose={() => setEditModal(null)} formData={formData} />
      )}

      <div className="flex items-center justify-between mb-6 gap-3">
        <h2 className="text-xl font-bold">Spalari Azi</h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cauta numar..."
            className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] outline-none focus:border-brand w-36"
          />
        </div>
      </div>

      {cursCards.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-yellow-600 dark:text-yellow-400">CURS Neplatit</span>
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium">{cursCards.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cursCards.map((card, i) => renderCard(card, i))}
          </div>
        </div>
      )}

      {paidCards.length > 0 && (
        <div>
          {cursCards.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Platite</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paidCards.map((card, i) => renderCard(card, cursCards.length + i))}
          </div>
        </div>
      )}

      {filtered.length === 0 && search && (
        <div className="text-center py-16 text-gray-400">
          Niciun rezultat pentru "{search}"
        </div>
      )}
    </div>
  )
}
