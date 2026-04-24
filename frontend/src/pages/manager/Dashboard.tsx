import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { managerApi } from '../../api/client'
import { ClientCard, Serviciu, PretServicii, Spalator } from '../../types'
import { Car, Pencil, X, Search, Plus, ChevronDown, ChevronUp } from 'lucide-react'

const PAYMENT_BADGE: Record<string, string> = {
  CASH: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CARD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CURS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  CONTRACT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  PROTOCOL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

const PAYMENT_BTN: Record<string, string> = {
  CASH: 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 active:bg-green-100 dark:active:bg-green-900/30 active:shadow-[0_0_8px_rgba(34,197,94,0.4)]',
  CARD: 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 active:bg-blue-100 dark:active:bg-blue-900/30 active:shadow-[0_0_8px_rgba(59,130,246,0.4)]',
  CONTRACT: 'border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 active:bg-purple-100 dark:active:bg-purple-900/30 active:shadow-[0_0_8px_rgba(168,85,247,0.4)]',
  PROTOCOL: 'border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 active:bg-orange-100 dark:active:bg-orange-900/30 active:shadow-[0_0_8px_rgba(249,115,22,0.4)]',
}
import { Link } from 'react-router-dom'
import brandsData from '../../data/carBrands.json'

const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const brandLogoByName: Record<string, string> = {}
for (const b of brandsData as Array<{ name: string; image?: { thumb?: string } }>) {
  if (b.image?.thumb) brandLogoByName[stripDiacritics(b.name)] = b.image.thumb
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
  const [spalatorId, setSpalatorId] = useState(s.spalatori_id)
  const [tipPlata, setTipPlata] = useState(s.tipPlata)
  const [nrFirma, setNrFirma] = useState(s.nrFirma ?? '')
  const [notite, setNotite] = useState(s.notite ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['manager', 'dashboard'] })

  const editMutation = useMutation({
    mutationFn: () => managerApi.editServiciu(s.id, { serviciiPrestate, spalatori_id: spalatorId, tipPlata, nrFirma: nrFirma || null, notite: notite || null }),
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
          <select value={spalatorId ?? ''} onChange={e => { const id = Number(e.target.value); setSpalatorId(id); const sp = formData?.spalatori.find((s: Spalator) => s.id === id); if (sp) setSpalator(sp.numeSpalator) }} className="form-input">
            {formData?.spalatori.map((sp: Spalator) => (
              <option key={sp.id} value={sp.id}>{sp.numeSpalator}</option>
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

        <div className="flex justify-end pt-2">
          <button onClick={() => editMutation.mutate()}
            disabled={editMutation.isPending}
            className="btn-primary px-5 py-1.5 text-sm">
            {editMutation.isPending ? 'Se salveaza...' : 'Salveaza'}
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
  const [cursOpen, setCursOpen] = useState(true)
  const [cursPayOpen, setCursPayOpen] = useState<number | null>(null)
  const qc = useQueryClient()

  // Close CURS dropdown on outside click
  useEffect(() => {
    if (cursPayOpen === null) return
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.relative')) setCursPayOpen(null)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [cursPayOpen])

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

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card overflow-hidden animate-pulse">
          <div className="bg-gray-200 dark:bg-gray-700 h-12" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )

  if (cards.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <Car size={56} className="mb-4 opacity-30" />
      <p className="text-lg font-medium">Nicio spalare inregistrata azi.</p>
      <Link to="/manager/form" className="mt-4 inline-flex items-center gap-2 btn-primary px-5 py-2.5">
        <Plus size={16} />
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
        className={`card overflow-visible ${hasCurs ? 'border-l-4 border-l-yellow-400' : ''}`}>
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
          <div className="w-24 shrink-0 flex items-center justify-center border-r border-gray-100 dark:border-gray-800">
            {brandLogoByName[stripDiacritics(card.client.marcaAutoturism ?? '')] ? (
              <img
                src={brandLogoByName[stripDiacritics(card.client.marcaAutoturism ?? '')]}
                alt={card.client.marcaAutoturism}
                className="w-14 h-14 object-contain"
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
              <div key={s.id} className="px-4 py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="text-sm font-semibold">{s.serviciiPrestate}</div>
                      <button type="button"
                        onClick={() => setEditModal({ serviciu: s, plate: card.client.numarAutoturism })}
                        className="text-gray-400 hover:text-brand transition-colors shrink-0">
                        <Pencil size={12} />
                      </button>
                    </div>
                    <div className="text-[13px] text-gray-400 mt-0.5">{new Date(s.dataSpalare).toLocaleTimeString('ro', { hour: '2-digit', minute: '2-digit' })}</div>
                    {s.notite && <div className="text-[11px] text-gray-400 italic mt-0.5 truncate max-w-[160px]">{s.notite}</div>}
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <div className="text-sm font-bold text-brand">{s.pretServicii} RON</div>
                    <div className="flex items-center justify-end gap-1.5 mt-1 flex-wrap">
                      {s.tipPlata !== 'CURS' && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${PAYMENT_BADGE[s.tipPlata]}`}>
                          {s.tipPlata}{s.nrFirma ? ` · ${s.nrFirma}` : ''}
                        </span>
                      )}
                      {s.tipPlata === 'CURS' && (
                        <div className="relative">
                          <button type="button" onClick={() => setCursPayOpen(cursPayOpen === s.id ? null : s.id)}
                            className={`text-xs px-2 py-0.5 rounded font-medium inline-flex items-center gap-1 ${PAYMENT_BADGE.CURS}`}>
                            CURS
                            <ChevronDown size={10} className={`transition-transform ${cursPayOpen === s.id ? 'rotate-180' : ''}`} />
                          </button>
                          {cursPayOpen === s.id && (
                            <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 flex flex-col gap-1 min-w-[120px]">
                              {firmaInput?.id === s.id ? (
                                <div className="flex items-center gap-1">
                                  <input autoFocus value={firmaValue} onChange={e => setFirmaValue(e.target.value)}
                                    placeholder="Nr. Firma"
                                    className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1f1f1f] w-24 outline-none focus:border-brand"
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && firmaValue.trim()) {
                                        updatePayment.mutate({ id: s.id, tipPlata: firmaInput.tipPlata, nrFirma: firmaValue.trim() })
                                        setFirmaInput(null); setFirmaValue(''); setCursPayOpen(null)
                                      }
                                      if (e.key === 'Escape') { setFirmaInput(null); setFirmaValue('') }
                                    }} />
                                  <button type="button" onClick={() => {
                                    if (firmaValue.trim()) {
                                      updatePayment.mutate({ id: s.id, tipPlata: firmaInput.tipPlata, nrFirma: firmaValue.trim() })
                                      setFirmaInput(null); setFirmaValue(''); setCursPayOpen(null)
                                    }
                                  }} className="text-xs px-2 py-1 rounded bg-brand text-white font-medium">OK</button>
                                </div>
                              ) : (
                                <>
                                  {['CASH', 'CARD'].map(opt => (
                                    <button key={opt} type="button"
                                      onClick={() => { updatePayment.mutate({ id: s.id, tipPlata: opt }); setCursPayOpen(null) }}
                                      className={`text-xs px-3 py-1.5 rounded font-medium border transition-all text-left ${PAYMENT_BTN[opt]}`}>
                                      {opt}
                                    </button>
                                  ))}
                                  {['CONTRACT', 'PROTOCOL'].map(opt => (
                                    <button key={opt} type="button"
                                      onClick={() => { setFirmaInput({ id: s.id, tipPlata: opt }); setFirmaValue('') }}
                                      className={`text-xs px-3 py-1.5 rounded font-medium border transition-all text-left ${PAYMENT_BTN[opt]}`}>
                                      {opt}
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                        </div>
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
          <button
            type="button"
            onClick={() => setCursOpen(!cursOpen)}
            className="flex items-center gap-2 mb-3 group"
          >
            <ChevronDown size={14} className={`text-yellow-600 dark:text-yellow-400 transition-transform ${cursOpen ? '' : '-rotate-90'}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-yellow-600 dark:text-yellow-400 group-active:opacity-70">CURS Neplatit</span>
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium">{cursCards.length}</span>
          </button>
          {cursOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {cursCards.map((card, i) => renderCard(card, i))}
            </div>
          )}
        </div>
      )}

      {paidCards.length > 0 && (
        <div>
          {cursCards.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Platite</span>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
