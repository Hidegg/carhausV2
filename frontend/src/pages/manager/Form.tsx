import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { managerApi } from '../../api/client'
import { PretServicii, Spalator } from '../../types'
import BrandPicker from '../../components/BrandPicker'
import brandsData from '../../data/carBrands.json'
import { Plus } from 'lucide-react'

const TIP_OPTIONS = ['AUTOTURISM', 'SUV', 'VAN']

const brandLogoByName: Record<string, string> = {}
for (const b of brandsData as Array<{ name: string; slug: string; image?: { thumb?: string } }>) {
  if (b.image?.thumb) brandLogoByName[b.name.toLowerCase()] = b.image.thumb
}

function getBucharestNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

function getBucharestClock() {
  const now = new Date()
  const weekday = new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', weekday: 'long' }).format(now)
  const day = new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', day: 'numeric' }).format(now)
  const month = new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', month: 'long' }).format(now)
  const year = new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', year: 'numeric' }).format(now)
  const time = new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} - ${day} ${month} ${year} - ${time}`
}

export default function ManagerForm() {
  const [numar, setNumar] = useState('')
  const [tip, setTip] = useState('AUTOTURISM')
  const [marca, setMarca] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [clientExistent, setClientExistent] = useState(false)
  const [date, setDate] = useState(getBucharestNow)
  const [clock, setClock] = useState(getBucharestClock)
  const [spalator, setSpalator] = useState('')
  const [tipPlata, setTipPlata] = useState('CASH')
  const [nrFirma, setNrFirma] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [gdpr, setGdpr] = useState(false)
  const [newsletter, setNewsletter] = useState(false)
  const [termeni, setTermeni] = useState(false)
  const [brandPickerOpen, setBrandPickerOpen] = useState(false)
  const [success, setSuccess] = useState(false)
  const clockRef = useRef<ReturnType<typeof setInterval>>()

  // Live clock — updates every second, syncs date state every minute
  useEffect(() => {
    clockRef.current = setInterval(() => {
      setClock(getBucharestClock())
      setDate(getBucharestNow())
    }, 1000)
    return () => clearInterval(clockRef.current)
  }, [])

  const { data: formData } = useQuery({ queryKey: ['form-data'], queryFn: managerApi.formData })

  const mutation = useMutation({
    mutationFn: managerApi.addServicii,
    onSuccess: () => {
      setSuccess(true)
      setNumar(''); setTip('AUTOTURISM'); setMarca(''); setEmail(''); setTelefon('')
      setSelectedServices([]); setClientExistent(false)
      setGdpr(false); setNewsletter(false); setTermeni(false)
      setTipPlata('CASH'); setNrFirma('')
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
      gdprAcceptat: gdpr,
      newsletterAcceptat: newsletter,
      termeniAcceptati: termeni,
      date,
      spalator,
      tipPlata,
      nrFirma: nrFirma || null,
      serviciiPrestate: selectedServices
    })
  }

  const toggleService = (name: string) =>
    setSelectedServices(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])

  return (
    <div className="max-w-2xl mx-auto">
      {brandPickerOpen && (
        <BrandPicker onSelect={name => setMarca(name)} onClose={() => setBrandPickerOpen(false)} />
      )}
      {mutation.isError && (
        <div className="mb-4 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          Eroare la inregistrare. Verifica datele.
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
        {/* Live clock */}
        <div className="text-center mb-6">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{clock}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="text" value={marca} required onChange={() => {}} className="sr-only" aria-hidden />
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
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setTip('AUTOTURISM')}
                  className={`col-span-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    tip === 'AUTOTURISM' ? 'bg-brand text-white border-brand' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand'
                  }`}>
                  AUTOTURISM
                </button>
                {['SUV', 'VAN'].map(t => (
                  <button key={t} type="button" onClick={() => setTip(t)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      tip === t ? 'bg-brand text-white border-brand' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Marca</label>
              <button type="button" onClick={() => setBrandPickerOpen(true)}
                className="form-input w-full flex flex-col items-center justify-center gap-1 py-3 h-20">
                {marca ? (
                  <>
                    {brandLogoByName[marca.toLowerCase()] ? (
                      <img src={brandLogoByName[marca.toLowerCase()]} alt={marca}
                        className="w-1/2 max-h-10 object-contain" />
                    ) : (
                      <span className="text-2xl font-bold text-gray-300 dark:text-gray-600">{marca.charAt(0)}</span>
                    )}
                    <span className="text-gray-900 dark:text-white font-medium text-xs">{marca}</span>
                  </>
                ) : (
                  <Plus size={20} className="text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Email + Phone */}
          {!clientExistent && (
            <>
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
              {/* GDPR / Termeni / Newsletter */}
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={termeni} onChange={e => setTermeni(e.target.checked)}
                    className="accent-brand mt-0.5" required />
                  <span>Am acceptat <span className="text-brand underline cursor-pointer">Termenii si Conditiile</span> <span className="text-red-500">*</span></span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)}
                    className="accent-brand mt-0.5" required />
                  <span>Acord prelucrare date personale (GDPR) <span className="text-red-500">*</span></span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer text-sm text-gray-500">
                  <input type="checkbox" checked={newsletter} onChange={e => setNewsletter(e.target.checked)}
                    className="accent-brand mt-0.5" />
                  <span>Doresc sa primesc oferte si noutati (newsletter)</span>
                </label>
              </div>
            </>
          )}

          {/* Tip Plata */}
          <div>
            <label className="form-label">Tip Plata</label>
            <div className="flex gap-2 mb-2">
              {['CASH', 'CARD', 'CURS'].map(t => (
                <button key={t} type="button" onClick={() => setTipPlata(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    tipPlata === t ? 'bg-brand text-white border-brand' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {['CONTRACT', 'PROTOCOL'].map(t => (
                <button key={t} type="button" onClick={() => setTipPlata(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    tipPlata === t ? 'bg-brand text-white border-brand' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
            {(tipPlata === 'CONTRACT' || tipPlata === 'PROTOCOL') && (
              <div className="mt-2">
                <input
                  type="text"
                  value={nrFirma}
                  onChange={e => setNrFirma(e.target.value)}
                  placeholder="Nr. Firma"
                  className="form-input"
                  required
                />
              </div>
            )}
          </div>

          {/* Spalator */}
          <div>
            <label className="form-label">Spalator</label>
            <div className="grid grid-cols-4 gap-2">
              {formData?.spalatori.map((s: Spalator) => (
                <button key={s.id} type="button" onClick={() => setSpalator(s.numeSpalator)}
                  className={`py-3 rounded-lg text-sm font-medium border transition-colors ${
                    spalator === s.numeSpalator
                      ? 'bg-brand text-white border-brand'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand'
                  }`}>
                  {s.numeSpalator}
                </button>
              ))}
            </div>
            <input type="text" value={spalator} required readOnly className="sr-only" aria-hidden />
          </div>

          {/* Servicii */}
          <div>
            <label className="form-label">Servicii Prestate</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {formData?.preturi.map((p: PretServicii) => (
                <label key={p.serviciiPrestate}
                  className={`flex items-start gap-2 text-sm cursor-pointer p-2.5 rounded-lg border transition-colors ${
                    selectedServices.includes(p.serviciiPrestate)
                      ? 'border-brand bg-brand/5 dark:bg-brand/10'
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

          {success && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="px-4 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium text-center">
              Serviciu inregistrat cu succes.
            </motion.div>
          )}
        </form>
      </motion.div>
    </div>
  )
}
