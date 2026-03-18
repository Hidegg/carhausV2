import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '../../api/client'
import { Locatie, PretServicii, ManagerUser } from '../../types'
import { Trash2, Pencil, X, Check } from 'lucide-react'

type Tab = 'locatii' | 'spalatori' | 'preturi' | 'manageri'

interface EditManagerState {
  id: number
  username: string
  password: string
  locatie_id: number | null
}

export default function AdminSettings() {
  const [tab, setTab] = useState<Tab>('locatii')
  const qc = useQueryClient()
  const inv = () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
  const invMgr = () => qc.invalidateQueries({ queryKey: ['admin', 'managers'] })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.settings
  })

  const { data: managers = [], isLoading: mgLoading } = useQuery<ManagerUser[]>({
    queryKey: ['admin', 'managers'],
    queryFn: adminApi.getManagers,
    enabled: tab === 'manageri',
  })

  const addLocatie = useMutation({ mutationFn: adminApi.addLocatie, onSuccess: inv })
  const deleteLocatie = useMutation({ mutationFn: adminApi.deleteLocatie, onSuccess: inv })
  const addSpalator = useMutation({ mutationFn: ({ name, lid }: { name: string; lid: number }) => adminApi.addSpalator(name, lid), onSuccess: inv })
  const deleteSpalator = useMutation({ mutationFn: adminApi.deleteSpalator, onSuccess: inv })
  const editPreturi = useMutation({ mutationFn: adminApi.editPreturi, onSuccess: inv })
  const addPret = useMutation({ mutationFn: adminApi.addPret, onSuccess: inv })
  const deletePret = useMutation({ mutationFn: adminApi.deletePret, onSuccess: inv })
  const addManager = useMutation({ mutationFn: adminApi.addManager, onSuccess: invMgr })
  const editManager = useMutation({ mutationFn: ({ id, data }: { id: number; data: Parameters<typeof adminApi.editManager>[1] }) => adminApi.editManager(id, data), onSuccess: invMgr })
  const deleteManager = useMutation({ mutationFn: adminApi.deleteManager, onSuccess: invMgr })

  const [newLoc, setNewLoc] = useState('')
  const [newSp, setNewSp] = useState<Record<number, string>>({})
  const [preturiState, setPreturiState] = useState<Record<number, PretServicii>>({})
  const [preturiDirty, setPreturiDirty] = useState(false)
  const [newPretName, setNewPretName] = useState('')
  const [pretError, setPretError] = useState('')

  // Manager form state
  const [newMgr, setNewMgr] = useState({ username: '', password: '', locatie_id: '' })
  const [editMgrState, setEditMgrState] = useState<EditManagerState | null>(null)
  const [mgrError, setMgrError] = useState('')

  const updatePret = (id: number, field: keyof PretServicii, val: string) => {
    const orig = data?.preturi.find((p: PretServicii) => p.id === id) ?? {}
    setPreturiState(ps => ({ ...ps, [id]: { ...orig, ...ps[id], [field]: parseFloat(val) || 0 } }))
    setPreturiDirty(true)
  }

  const savePreturi = () => {
    const updates = data?.preturi.map((p: PretServicii) => ({ ...p, ...(preturiState[p.id] ?? {}) }))
    editPreturi.mutate(updates, { onSuccess: () => setPreturiDirty(false) })
  }

  const handleAddManager = () => {
    setMgrError('')
    if (!newMgr.username || !newMgr.password) { setMgrError('Username si parola sunt obligatorii'); return }
    addManager.mutate(
      { username: newMgr.username, password: newMgr.password, locatie_id: newMgr.locatie_id ? Number(newMgr.locatie_id) : null },
      {
        onSuccess: () => setNewMgr({ username: '', password: '', locatie_id: '' }),
        onError: (e: unknown) => setMgrError((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Eroare'),
      }
    )
  }

  const handleSaveEdit = () => {
    if (!editMgrState) return
    setMgrError('')
    editManager.mutate(
      { id: editMgrState.id, data: { username: editMgrState.username, password: editMgrState.password || undefined, locatie_id: editMgrState.locatie_id } },
      {
        onSuccess: () => setEditMgrState(null),
        onError: (e: unknown) => setMgrError((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Eroare'),
      }
    )
  }

  if (isLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>

  const TABS: { key: Tab; label: string }[] = [
    { key: 'locatii', label: 'Locatii' },
    { key: 'spalatori', label: 'Spalatori' },
    { key: 'preturi', label: 'Servicii & Preturi' },
    { key: 'manageri', label: 'Manageri' },
  ]

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Setari</h2>

      <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-brand'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'locatii' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 max-w-lg">
          {data?.locatii.map((loc: Locatie) => (
            <div key={loc.id} className="card px-4 py-3 flex items-center justify-between">
              <span className="font-medium">{loc.numeLocatie}</span>
              <button onClick={() => confirm(`Stergi ${loc.numeLocatie}?`) && deleteLocatie.mutate(loc.id)}
                className="text-red-400 hover:text-red-600 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div className="card px-4 py-3 border-dashed flex gap-3">
            <input value={newLoc} onChange={e => setNewLoc(e.target.value.toUpperCase())}
              placeholder="Nume locatie noua" className="form-input flex-1" />
            <button onClick={() => { addLocatie.mutate(newLoc); setNewLoc('') }} className="btn-primary whitespace-nowrap">
              + Adauga
            </button>
          </div>
        </motion.div>
      )}

      {tab === 'spalatori' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {data?.locatii.map((loc: Locatie) => (
            <div key={loc.id} className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-semibold">{loc.numeLocatie}</h4>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {loc.spalatori?.map(sp => (
                  <div key={sp.id} className="px-4 py-3 flex items-center justify-between text-sm">
                    <span className="font-medium">{sp.numeSpalator}</span>
                    <button onClick={() => confirm(`Stergi ${sp.numeSpalator}?`) && deleteSpalator.mutate(sp.id)}
                      className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {(!loc.spalatori || loc.spalatori.length === 0) && (
                  <p className="px-4 py-3 text-sm text-gray-400">Niciun spalator.</p>
                )}
              </div>
              <div className="px-4 py-3 border-t border-dashed border-gray-200 dark:border-gray-700 flex gap-3">
                <input value={newSp[loc.id] ?? ''} onChange={e => setNewSp(s => ({ ...s, [loc.id]: e.target.value }))}
                  placeholder="Nume spalator" className="form-input flex-1 text-sm" />
                <button onClick={() => { addSpalator.mutate({ name: newSp[loc.id] ?? '', lid: loc.id }); setNewSp(s => ({ ...s, [loc.id]: '' })) }}
                  className="btn-primary text-xs px-3">+ Adauga</button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {tab === 'preturi' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="card overflow-x-auto scrollbar-hide">
            <table className="text-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '200px' }} />
                {['','','','','',''].map((_, i) => <col key={i} style={{ width: '110px' }} />)}
              </colgroup>
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Serviciu</th>
                  {['Pret Auto', 'Pret SUV', 'Pret Van', 'Com. Auto', 'Com. SUV', 'Com. Van'].map(h => (
                    <th key={h} className="py-3 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data?.preturi.map((p: PretServicii) => {
                  const cur = { ...p, ...(preturiState[p.id] ?? {}) }
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-2 font-medium truncate">
                        <div className="flex items-center gap-2">
                          <span>{p.serviciiPrestate}</span>
                          <button onClick={() => confirm(`Stergi serviciul "${p.serviciiPrestate}"?`) && deletePret.mutate(p.id)}
                            className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                      {(['pretAutoturism', 'pretSUV', 'pretVan', 'comisionAutoturism', 'comisionSUV', 'comisionVan'] as (keyof PretServicii)[]).map(field => (
                        <td key={field} className="py-2 text-center">
                          <input type="number" step="0.01" defaultValue={cur[field] as number}
                            onChange={e => updatePret(p.id, field, e.target.value)}
                            className="w-20 text-center px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-brand [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {preturiDirty && (
            <div className="mt-4 flex justify-end">
              <button onClick={savePreturi} className="btn-primary px-6 py-2">
                {editPreturi.isPending ? 'Se salveaza...' : 'Salveaza Preturi'}
              </button>
            </div>
          )}
          <div className="mt-4 card px-4 py-3 border-dashed flex gap-3 items-center max-w-sm">
            {pretError && <p className="text-xs text-red-500">{pretError}</p>}
            <input value={newPretName} onChange={e => setNewPretName(e.target.value)}
              placeholder="Nume serviciu nou" className="form-input flex-1 text-sm" />
            <button onClick={() => {
              setPretError('')
              if (!newPretName.trim()) { setPretError('Numele este obligatoriu'); return }
              addPret.mutate(newPretName.trim(), {
                onSuccess: () => setNewPretName(''),
                onError: (e: unknown) => setPretError((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Eroare'),
              })
            }} className="btn-primary text-xs px-3 whitespace-nowrap">+ Adauga</button>
          </div>
        </motion.div>
      )}

      {tab === 'manageri' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-2xl">
          {mgrError && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded">{mgrError}</div>
          )}

          {/* Manager list grouped by location */}
          {mgLoading ? (
            <div className="text-gray-400 text-sm py-4">Se incarca...</div>
          ) : (
            data?.locatii.map((loc: Locatie) => {
              const locManagers = managers.filter(m => m.locatie_id === loc.id)
              return (
                <div key={loc.id} className="card overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-semibold">{loc.numeLocatie}</h4>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {locManagers.map(m => (
                      <div key={m.id} className="px-4 py-3 text-sm">
                        {editMgrState?.id === m.id ? (
                          <div className="flex flex-wrap gap-2 items-center">
                            <input value={editMgrState.username}
                              onChange={e => setEditMgrState(s => s ? { ...s, username: e.target.value } : s)}
                              className="form-input text-sm w-36" placeholder="Username" />
                            <input value={editMgrState.password}
                              onChange={e => setEditMgrState(s => s ? { ...s, password: e.target.value } : s)}
                              className="form-input text-sm w-36" placeholder="Parola noua (optional)" type="password" />
                            <select value={editMgrState.locatie_id ?? ''}
                              onChange={e => setEditMgrState(s => s ? { ...s, locatie_id: e.target.value ? Number(e.target.value) : null } : s)}
                              className="form-input text-sm w-36">
                              <option value="">Fara locatie</option>
                              {data?.locatii.map((l: Locatie) => (
                                <option key={l.id} value={l.id}>{l.numeLocatie}</option>
                              ))}
                            </select>
                            <button onClick={handleSaveEdit} className="text-green-500 hover:text-green-700"><Check size={16} /></button>
                            <button onClick={() => { setEditMgrState(null); setMgrError('') }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{m.username}</span>
                            <div className="flex gap-3">
                              <button onClick={() => setEditMgrState({ id: m.id, username: m.username, password: '', locatie_id: m.locatie_id })}
                                className="text-gray-400 hover:text-brand transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => confirm(`Stergi managerul ${m.username}?`) && deleteManager.mutate(m.id)}
                                className="text-red-400 hover:text-red-600 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {locManagers.length === 0 && (
                      <p className="px-4 py-3 text-sm text-gray-400">Niciun manager.</p>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {/* Managers without a location */}
          {(() => {
            const unassigned = managers.filter(m => m.locatie_id === null)
            if (!unassigned.length) return null
            return (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-400">Fara locatie</h4>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {unassigned.map(m => (
                    <div key={m.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <span className="font-medium">{m.username}</span>
                      <div className="flex gap-3">
                        <button onClick={() => setEditMgrState({ id: m.id, username: m.username, password: '', locatie_id: m.locatie_id })}
                          className="text-gray-400 hover:text-brand transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => confirm(`Stergi managerul ${m.username}?`) && deleteManager.mutate(m.id)}
                          className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Add manager form */}
          <div className="card px-4 py-4 border-dashed">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Manager nou</p>
            <div className="flex flex-wrap gap-2">
              <input value={newMgr.username} onChange={e => setNewMgr(s => ({ ...s, username: e.target.value }))}
                placeholder="Username" className="form-input text-sm w-40" />
              <input value={newMgr.password} onChange={e => setNewMgr(s => ({ ...s, password: e.target.value }))}
                placeholder="Parola" type="password" className="form-input text-sm w-40" />
              <select value={newMgr.locatie_id} onChange={e => setNewMgr(s => ({ ...s, locatie_id: e.target.value }))}
                className="form-input text-sm w-40">
                <option value="">Fara locatie</option>
                {data?.locatii.map((l: Locatie) => (
                  <option key={l.id} value={l.id}>{l.numeLocatie}</option>
                ))}
              </select>
              <button onClick={handleAddManager} disabled={addManager.isPending}
                className="btn-primary text-sm px-4 whitespace-nowrap">
                {addManager.isPending ? '...' : '+ Adauga'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
