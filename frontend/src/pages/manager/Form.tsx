import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { managerApi } from '../../api/client'
import { PretServicii, Spalator } from '../../types'

const TIP_OPTIONS = ['AUTOTURISM', 'SUV', 'VAN']

export default function ManagerForm() {
  const [numar, setNumar] = useState('')
  const [tip, setTip] = useState('')
  const [marca, setMarca] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [clientExistent, setClientExistent] = useState(false)
  const [date, setDate] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [spalator, setSpalator] = useState('')
  const [tipPlata, setTipPlata] = useState('CASH')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  const { data: formData } = useQuery({ queryKey: ['form-data'], queryFn: managerApi.formData })

  const mutation = useMutation({
    mutationFn: managerApi.addServicii,
    onSuccess: () => {
      setSuccess(true)
      setNumar(''); setTip(''); setMarca(''); setEmail(''); setTelefon('')
      setSelectedServices([]); setClientExistent(false)
      setTimeout(() => setSuccess(false), 3000)
    }
  })

  useEffect(() => {
    if (numar.length < 4) { setClientExistent(false); return }
    const t = setTimeout(async () => {
      const data = await managerApi.getClient(numar.toUpperCase())
      if (data.tipAutoturism) {
        setTip(data.tipAutoturism); setMarca(data.marcaAutoturism)
        setEmail(data.emailClient); setTelefon(data.telefonClient)
        setClientExistent(true)
      } else setClientExistent(false)
    }, 400)
    return () => clearTimeout(t)
  }, [numar])

  const getPret = (p: PretServicii) => {
    if (tip === 'SUV') return p.pretSUV
    if (tip === 'VAN') return p.pretVan
    return p.pretAutoturism
  }

  const total = selectedServices.reduce((sum, sv) => {
    const p = formData?.preturi.find((pr: PretServicii) => pr.serviciiPrestate === sv)
    return sum + (p ? getPret(p) : 0)
  }, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      numarAutoturism: numar.toUpperCase(),
      tipAutoturism: tip,
      marcaAutoturism: marca,
      emailClient: email || null,
      telefonClient: telefon || null,
      date,
      spalator,
      tipPlata,
      serviciiPrestate: selectedServices
    })
  }

  const toggleService = (name: string) =>
    setSelectedServices(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-6">Inregistrare Serviciu</h2>

      {success && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 px-4 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium">
          Serviciu inregistrat cu succes.
        </motion.div>
      )}

      {mutation.isError && (
        <div className="mb-4 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          Eroare la inregistrare. Verifica datele.
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Numar */}
          <div>
            <label className="form-label">Numar Autoturism</label>
            <input type="text" value={numar} onChange={e => setNumar(e.target.value.toUpperCase())}
              className="form-input uppercase" placeholder="ex: B123ABC" required />
            {clientExistent && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Client existent — date completate automat.</p>
            )}
          </div>

          {/* Tip + Marca */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tip Autoturism</label>
              <select value={tip} onChange={e => setTip(e.target.value)} className="form-input" required>
                <option value="">-- Selecteaza --</option>
                {TIP_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Marca</label>
              <input type="text" value={marca} onChange={e => setMarca(e.target.value.toUpperCase())}
                className="form-input" placeholder="ex: BMW" required />
            </div>
          </div>

          {/* Email + Phone */}
          {!clientExistent && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Email <span className="text-gray-400 text-xs">(optional)</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="form-input" placeholder="client@email.com" />
              </div>
              <div>
                <label className="form-label">Telefon <span className="text-gray-400 text-xs">(optional)</span></label>
                <input type="text" value={telefon} onChange={e => setTelefon(e.target.value)}
                  className="form-input" placeholder="07xx xxx xxx" />
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="form-label">Data si Ora</label>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
              className="form-input" required />
          </div>

          {/* Spalator */}
          <div>
            <label className="form-label">Spalator</label>
            <select value={spalator} onChange={e => setSpalator(e.target.value)} className="form-input" required>
              <option value="">-- Selecteaza spalator --</option>
              {formData?.spalatori.map((s: Spalator) => (
                <option key={s.id} value={s.numeSpalator}>{s.numeSpalator}</option>
              ))}
            </select>
          </div>

          {/* Tip Plata */}
          <div>
            <label className="form-label">Tip Plata</label>
            <div className="flex gap-2">
              {['CASH', 'CARD', 'CURS'].map(t => (
                <button key={t} type="button" onClick={() => setTipPlata(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    tipPlata === t ? 'bg-brand text-white border-brand' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Servicii */}
          <div>
            <label className="form-label">Servicii Prestate</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {formData?.preturi.map((p: PretServicii) => (
                <label key={p.serviciiPrestate}
                  className={`flex items-start gap-2 text-sm cursor-pointer p-2.5 rounded-lg border transition-colors ${
                    selectedServices.includes(p.serviciiPrestate)
                      ? 'border-brand bg-orange-50 dark:bg-gray-800'
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand'
                  }`}>
                  <input type="checkbox" checked={selectedServices.includes(p.serviciiPrestate)}
                    onChange={() => toggleService(p.serviciiPrestate)} className="accent-brand mt-0.5" />
                  <span>
                    {p.serviciiPrestate}
                    <span className="block text-xs text-gray-400">{getPret(p)} RON</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center py-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500">Total estimat:</span>
            <span className="text-lg font-bold text-brand">{total.toFixed(2)} RON</span>
          </div>

          <button type="submit" disabled={mutation.isPending}
            className="btn-primary w-full py-3 text-base">
            {mutation.isPending ? 'Se inregistreaza...' : 'Inregistreaza Serviciu'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
