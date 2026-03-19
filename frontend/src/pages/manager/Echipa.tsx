import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { managerApi } from '../../api/client'

interface Spalator { id: number; numeSpalator: string; prezentAzi: boolean }

export default function ManagerEchipa() {
  const qc = useQueryClient()
  const inv = () => qc.invalidateQueries({ queryKey: ['form-data'] })

  const { data: formData, isLoading } = useQuery({
    queryKey: ['form-data'],
    queryFn: managerApi.formData,
  })
  const spalatori: Spalator[] = formData?.spalatori ?? []

  // For Echipa page we need all workers (not filtered by prezentAzi), so use getEchipa
  const { data: allSpalatori = [], isLoading: teamsLoading } = useQuery<Spalator[]>({
    queryKey: ['echipa'],
    queryFn: managerApi.getEchipa,
  })

  const addMutation = useMutation({ mutationFn: managerApi.addSpalator, onSuccess: () => { inv(); qc.invalidateQueries({ queryKey: ['echipa'] }) } })
  const deleteMutation = useMutation({ mutationFn: managerApi.deleteSpalator, onSuccess: () => { inv(); qc.invalidateQueries({ queryKey: ['echipa'] }) } })
  const toggleMutation = useMutation({
    mutationFn: ({ id, prezentAzi }: { id: number; prezentAzi: boolean }) => managerApi.toggleSpalator(id, prezentAzi),
    onSuccess: () => { inv(); qc.invalidateQueries({ queryKey: ['echipa'] }) },
  })

  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleAdd = () => {
    setError('')
    if (!name.trim()) { setError('Introdu un nume.'); return }
    addMutation.mutate(name.trim(), {
      onSuccess: () => setName(''),
      onError: (e: unknown) => setError((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Eroare'),
    })
  }

  if (isLoading || teamsLoading) return <div className="text-center py-20 text-gray-400">Se incarca...</div>

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-6">Echipa mea</h2>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden mb-4">
        {allSpalatori.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">Niciun spalator adaugat.</p>
        )}
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {allSpalatori.map((s, i) => (
            <motion.div key={s.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleMutation.mutate({ id: s.id, prezentAzi: !s.prezentAzi })}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    s.prezentAzi ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}>
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                    s.prezentAzi ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
                <div>
                  <span className={`font-medium text-sm ${!s.prezentAzi ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                    {s.numeSpalator}
                  </span>
                  <span className={`ml-2 text-xs ${s.prezentAzi ? 'text-green-500' : 'text-gray-400'}`}>
                    {s.prezentAzi ? 'Prezent' : 'Absent'}
                  </span>
                </div>
              </div>
              <button onClick={() => confirm(`Stergi ${s.numeSpalator}?`) && deleteMutation.mutate(s.id)}
                className="text-red-400 hover:text-red-600 transition-colors">
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="card px-4 py-4 border-dashed">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Adauga spalator</p>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nume spalator" className="form-input flex-1" />
          <button onClick={handleAdd} disabled={addMutation.isPending}
            className="btn-primary px-4 whitespace-nowrap">
            {addMutation.isPending ? '...' : '+ Adauga'}
          </button>
        </div>
      </div>
    </div>
  )
}
