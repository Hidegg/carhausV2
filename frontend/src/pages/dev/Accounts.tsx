import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { devApi } from '../../api/client'
import { DevAccountsResponse, DevAccount, Locatie } from '../../types'

const ROL_BADGE: Record<string, string> = {
  dev: 'bg-brand/10 text-brand border border-brand/20',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  manager: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
}

interface FormState {
  username: string
  password: string
  rol: 'admin' | 'manager' | 'dev'
  locatie_id: number | null
}

const EMPTY_FORM: FormState = { username: '', password: '', rol: 'manager', locatie_id: null }

function AccountForm({
  initial, locatii, onSave, onCancel, loading, error
}: {
  initial: FormState
  locatii: Locatie[]
  onSave: (f: FormState) => void
  onCancel: () => void
  loading: boolean
  error: string | null
}) {
  const [form, setForm] = useState<FormState>(initial)
  const set = (k: keyof FormState, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-[#161616] border-b border-gray-100 dark:border-gray-700">
      <div>
        <label className="form-label">Username</label>
        <input className="form-input" value={form.username}
          onChange={e => set('username', e.target.value)} placeholder="username" />
      </div>
      <div>
        <label className="form-label">Parola {initial.username ? '(lasa gol = neschimbat)' : ''}</label>
        <input className="form-input" type="password" value={form.password}
          onChange={e => set('password', e.target.value)} placeholder="••••••••" />
      </div>
      <div>
        <label className="form-label">Rol</label>
        <select className="form-input" value={form.rol}
          onChange={e => set('rol', e.target.value as FormState['rol'])}>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
          <option value="dev">Dev</option>
        </select>
      </div>
      <div>
        <label className="form-label">Locatie</label>
        <select className="form-input" value={form.locatie_id ?? ''}
          onChange={e => set('locatie_id', e.target.value ? Number(e.target.value) : null)}>
          <option value="">— Niciuna —</option>
          {locatii.map(l => <option key={l.id} value={l.id}>{l.numeLocatie}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
        <button onClick={() => onSave(form)} disabled={loading} className="btn-primary flex items-center gap-1">
          <Check size={14} /> {loading ? 'Se salveaza...' : 'Salveaza'}
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1">
          <X size={14} /> Anuleaza
        </button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}

export default function DevAccounts() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading } = useQuery<DevAccountsResponse>({
    queryKey: ['dev', 'accounts'],
    queryFn: devApi.accounts,
  })

  const addMutation = useMutation({
    mutationFn: devApi.addAccount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev', 'accounts'] }); setAdding(false); setFormError(null) },
    onError: (e: unknown) => setFormError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Eroare'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FormState> }) => devApi.editAccount(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev', 'accounts'] }); setEditId(null); setFormError(null) },
    onError: (e: unknown) => setFormError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Eroare'),
  })

  const deleteMutation = useMutation({
    mutationFn: devApi.deleteAccount,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dev', 'accounts'] }); setDeleteId(null) },
  })

  function handleAdd(form: FormState) {
    if (!form.username || !form.password) { setFormError('Username si parola sunt obligatorii'); return }
    addMutation.mutate(form)
  }

  function handleEdit(id: number, form: FormState, original: DevAccount) {
    const payload: Partial<FormState> = {}
    if (form.username !== original.username) payload.username = form.username
    if (form.password) payload.password = form.password
    if (form.rol !== original.rol) payload.rol = form.rol
    if (form.locatie_id !== original.locatie_id) payload.locatie_id = form.locatie_id
    editMutation.mutate({ id, data: payload })
  }

  const grouped = {
    dev: data?.users.filter(u => u.rol === 'dev') ?? [],
    admin: data?.users.filter(u => u.rol === 'admin') ?? [],
    manager: data?.users.filter(u => u.rol === 'manager') ?? [],
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">Conturi</h2>
        <button onClick={() => { setAdding(true); setEditId(null); setFormError(null) }}
          className="btn-primary flex items-center gap-1.5">
          <Plus size={14} /> Cont nou
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-6">Toti utilizatorii din sistem</p>

      <div className="card overflow-hidden">
        <AnimatePresence>
          {adding && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <AccountForm
                initial={EMPTY_FORM}
                locatii={data?.locatii ?? []}
                onSave={handleAdd}
                onCancel={() => { setAdding(false); setFormError(null) }}
                loading={addMutation.isPending}
                error={adding ? formError : null}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="p-8 text-center text-gray-400">Se incarca...</div>
        )}

        {(['dev', 'admin', 'manager'] as const).map(rol => (
          grouped[rol].length > 0 && (
            <div key={rol}>
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${ROL_BADGE[rol]}`}>
                  {rol}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {grouped[rol].map(u => (
                    <>
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium w-1/3">{u.username}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-sm">
                          {u.locatie ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => { setEditId(u.id); setAdding(false); setFormError(null) }}
                            className="p-1.5 text-gray-400 hover:text-brand transition-colors rounded">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteId(u.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded ml-1">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {editId === u.id && (
                          <tr key={`edit-${u.id}`}>
                            <td colSpan={3} className="p-0">
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                <AccountForm
                                  initial={{ username: u.username, password: '', rol: u.rol, locatie_id: u.locatie_id }}
                                  locatii={data?.locatii ?? []}
                                  onSave={form => handleEdit(u.id, form, u)}
                                  onCancel={() => { setEditId(null); setFormError(null) }}
                                  loading={editMutation.isPending}
                                  error={editId === u.id ? formError : null}
                                />
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ))}
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteId !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="card p-6 w-80 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <p className="font-semibold mb-1">Stergi contul?</p>
              <p className="text-sm text-gray-500 mb-4">
                {data?.users.find(u => u.id === deleteId)?.username}
              </p>
              <div className="flex gap-2">
                <button onClick={() => deleteMutation.mutate(deleteId!)}
                  disabled={deleteMutation.isPending}
                  className="btn-danger flex-1">
                  {deleteMutation.isPending ? 'Se sterge...' : 'Sterge'}
                </button>
                <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-400 transition-colors">
                  Anuleaza
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
