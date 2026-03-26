import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { managerApi } from '../../api/client'
import { PretServicii, Spalator } from '../../types'
import BrandPicker from '../../components/BrandPicker'
import brandsData from '../../data/carBrands.json'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'

interface ClientContext {
  vizite: number
  ultimaVizita: string | null
  serviciuFrecvent: string | null
  tipPlataFrecvent: string | null
}

function relativaRo(isoString: string): string {
  const diffDays = Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000)
  if (diffDays === 0) return 'azi'
  if (diffDays === 1) return 'ieri'
  if (diffDays < 7) return `${diffDays} zile în urmă`
  if (diffDays < 14) return 'săptămâna trecută'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} săpt. în urmă`
  if (diffDays < 60) return 'luna trecută'
  return `${Math.floor(diffDays / 30)} luni în urmă`
}

const MILESTONES = [10, 25, 50, 100, 200, 500]

const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const brandLogoByName: Record<string, string> = {}
for (const b of brandsData as Array<{ name: string; slug: string; image?: { thumb?: string } }>) {
  if (b.image?.thumb) brandLogoByName[stripDiacritics(b.name)] = b.image.thumb
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

export default function ManagerForm() {
  const [numar, setNumar] = useState('')
  const [tip, setTip] = useState('AUTOTURISM')
  const [marca, setMarca] = useState('')
  const [nume, setNume] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [clientExistent, setClientExistent] = useState(false)
  const [clientContext, setClientContext] = useState<ClientContext | null>(null)
  const [date] = useState(getBucharestNow)
  const [spalator, setSpalator] = useState('')
  const [spalatorId, setSpalatorId] = useState<number | null>(null)
  const [tipPlata, setTipPlata] = useState('CASH')
  const [nrFirma, setNrFirma] = useState('')
  const [notite, setNotite] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [gdpr, setGdpr] = useState(false)
  const [newsletter, setNewsletter] = useState(false)
  const [termeni, setTermeni] = useState(false)
  const [brandPickerOpen, setBrandPickerOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState('')
  const [plateDropdownOpen, setPlateDropdownOpen] = useState(false)
  const plateInputRef = useRef<HTMLDivElement>(null)

  const { data: formData } = useQuery({ queryKey: ['form-data'], queryFn: managerApi.formData })
  const { data: plateSuggestions = [] } = useQuery<{ numar: string; marca: string; tip: string }[]>({
    queryKey: ['plates-search', numar],
    queryFn: () => managerApi.platesSearch(numar),
    enabled: numar.length >= 2 && !clientExistent,
    staleTime: 30000,
  })

  const { data: nrFirmaSuggestions = [] } = useQuery<string[]>({
    queryKey: ['nrfirma-suggestions'],
    queryFn: managerApi.nrFirmaSuggestions,
    enabled: tipPlata === 'CONTRACT' || tipPlata === 'PROTOCOL',
  })

  const mutation = useMutation({
    mutationFn: managerApi.addServicii,
    onSuccess: () => {
      setSuccess(true)
      setNumar(''); setTip('AUTOTURISM'); setMarca(''); setNume(''); setEmail(''); setTelefon('')
      setSelectedServices([]); setClientExistent(false); setClientContext(null)
      setGdpr(false); setNewsletter(false); setTermeni(false)
      setSpalator(''); setSpalatorId(null)
      setTipPlata('CASH'); setNrFirma(''); setNotite('')
      setContactOpen(false); setPlateDropdownOpen(false)
      setTimeout(() => setSuccess(false), 3000)
      // Return focus to plate input for rapid entry
      setTimeout(() => {
        const plateEl = plateInputRef.current?.querySelector('input')
        plateEl?.focus()
      }, 100)
    }
  })

  useEffect(() => {
    if (plateSuggestions.length > 0 && !clientExistent) setPlateDropdownOpen(true)
    else setPlateDropdownOpen(false)
  }, [plateSuggestions, clientExistent])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (plateInputRef.current && !plateInputRef.current.contains(e.target as Node))
        setPlateDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (numar.length < 4) { setClientExistent(false); setClientContext(null); return }
    const t = setTimeout(async () => {
      const data = await managerApi.getClient(numar.toUpperCase())
      if (data.tipAutoturism) {
        setTip(data.tipAutoturism); setMarca(data.marcaAutoturism)
        setNume(data.numeClient); setEmail(data.emailClient); setTelefon(data.telefonClient)
        setClientExistent(true)
        setClientContext({
          vizite: data.vizite,
          ultimaVizita: data.ultimaVizita,
          serviciuFrecvent: data.serviciuFrecvent,
          tipPlataFrecvent: data.tipPlataFrecvent,
        })
        if (data.serviciuFrecvent) setSelectedServices([data.serviciuFrecvent])
        if (data.tipPlataFrecvent) setTipPlata(data.tipPlataFrecvent)
      } else {
        setClientExistent(false)
        setClientContext(null)
      }
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

  // Check if vizite+1 is a milestone (this will be the next visit)
  const nextVisit = (clientContext?.vizite ?? 0) + 1
  const isMilestone = clientContext && MILESTONES.includes(nextVisit)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (selectedServices.length === 0) { setFormError('Selecteaza cel putin un serviciu.'); return }
    mutation.mutate({
      numarAutoturism: numar.toUpperCase(),
      tipAutoturism: tip,
      marcaAutoturism: marca,
      numeClient: nume || null,
      emailClient: email || null,
      telefonClient: telefon || null,
      gdprAcceptat: gdpr,
      newsletterAcceptat: newsletter,
      termeniAcceptati: termeni,
      date,
      spalator,
      spalatori_id: spalatorId,
      tipPlata,
      nrFirma: nrFirma || null,
      notite: notite || null,
      serviciiPrestate: selectedServices
    })
  }

  const toggleService = (name: string) =>
    setSelectedServices(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])

  return (
    <div className="max-w-2xl mx-auto">
      {brandPickerOpen && (
        <BrandPicker selected={marca ? [marca] : []} onConfirm={names => { if (names[0]) setMarca(names[0]) }} onClose={() => setBrandPickerOpen(false)} singleSelect />
      )}
      {mutation.isError && (
        <div className="mb-4 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          Eroare la inregistrare. Verifica datele.
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6">

        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="text" value={marca} required onChange={() => {}} className="sr-only" aria-hidden />
          {/* Numar */}
          <div ref={plateInputRef}>
            <label className="form-label">Numar Autoturism</label>
            <div className="relative">
              <input type="text" value={numar}
                onChange={e => { setNumar(e.target.value.toUpperCase()); setClientExistent(false); setClientContext(null) }}
                onFocus={() => { if (plateSuggestions.length > 0 && !clientExistent) setPlateDropdownOpen(true) }}
                className="form-input uppercase" placeholder="ex: B123ABC" required autoComplete="off" />
              {plateDropdownOpen && plateSuggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                  {plateSuggestions.map(s => (
                    <button key={s.numar} type="button"
                      onMouseDown={e => { e.preventDefault(); setNumar(s.numar); setPlateDropdownOpen(false) }}
                      className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors">
                      <span className="font-mono font-semibold text-sm tracking-wider">{s.numar}</span>
                      <span className="text-xs text-gray-400">{s.marca} {s.tip}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {clientExistent && clientContext && (
              <div className="mt-1.5 flex items-center gap-3 flex-wrap px-1 text-xs text-gray-400 dark:text-gray-500">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  {clientContext.vizite} {clientContext.vizite === 1 ? 'vizită' : 'vizite'}
                </span>
                {clientContext.ultimaVizita && (
                  <span>{relativaRo(clientContext.ultimaVizita)}</span>
                )}
                {clientContext.serviciuFrecvent && (
                  <span>{clientContext.serviciuFrecvent}</span>
                )}
                {clientContext.tipPlataFrecvent && (
                  <span>{clientContext.tipPlataFrecvent}</span>
                )}
                {isMilestone && (
                  <span className="text-brand font-semibold">Vizita #{nextVisit} 🎉</span>
                )}
              </div>
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
                    {brandLogoByName[stripDiacritics(marca)] ? (
                      <img src={brandLogoByName[stripDiacritics(marca)]} alt={marca}
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

          {/* Contact + GDPR toggle */}
          {!clientExistent ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button type="button"
                onClick={() => setContactOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                <span>Date personale client</span>
                <div className={`relative w-10 h-[22px] rounded-full transition-colors ${contactOpen ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${contactOpen ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
                </div>
              </button>
              {contactOpen && (
                <div className="px-4 pb-4 pt-3 space-y-4 bg-white dark:bg-[#1a1a1a]">
                  <div>
                    <label className="form-label">Nume</label>
                    <input type="text" value={nume} onChange={e => setNume(e.target.value)}
                      className="form-input" placeholder="Nume client" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        className="form-input" placeholder="client@email.com" required={!telefon} />
                    </div>
                    <div>
                      <label className="form-label">Telefon</label>
                      <input type="text" value={telefon} onChange={e => setTelefon(e.target.value)}
                        className="form-input" placeholder="07xx xxx xxx" required={!email} />
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <label className="flex items-start gap-2.5 cursor-pointer text-sm">
                      <input type="checkbox" checked={termeni} onChange={e => setTermeni(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-brand focus:ring-brand accent-brand" required />
                      <span className="text-gray-700 dark:text-gray-300">Am acceptat <span className="text-brand underline cursor-pointer">Termenii si Conditiile</span> <span className="text-red-500">*</span></span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer text-sm">
                      <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-brand focus:ring-brand accent-brand" required />
                      <span className="text-gray-700 dark:text-gray-300">Acord prelucrare date personale (GDPR) <span className="text-red-500">*</span></span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer text-sm">
                      <input type="checkbox" checked={newsletter} onChange={e => setNewsletter(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-brand focus:ring-brand accent-brand" />
                      <span className="text-gray-500 dark:text-gray-400">Doresc sa primesc oferte si noutati (newsletter)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 px-1">
              {!nume && (
                <div>
                  <label className="form-label">Nume</label>
                  <input type="text" value={nume} onChange={e => setNume(e.target.value)}
                    className="form-input" placeholder="Adaugă nume client" />
                </div>
              )}
              {(nume || email || telefon) && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {nume && <span className="mr-3">{nume}</span>}
                  {email && <span className="mr-3">✉ {email}</span>}
                  {telefon && <span>☏ {telefon}</span>}
                </div>
              )}
            </div>
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
                  list="nrfirma-list"
                  required
                />
                <datalist id="nrfirma-list">
                  {nrFirmaSuggestions.map((s: string) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            )}
          </div>

          {/* Spalator */}
          <div>
            <label className="form-label">Spalator</label>
            <div className="grid grid-cols-4 gap-2">
              {formData?.spalatori.map((s: Spalator) => (
                <button key={s.id} type="button" onClick={() => { setSpalator(s.numeSpalator); setSpalatorId(s.id) }}
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

          {/* Notes */}
          <div>
            <label className="form-label">Notite <span className="text-gray-400 text-xs">(optional)</span></label>
            <textarea
              value={notite}
              onChange={e => setNotite(e.target.value)}
              rows={2}
              placeholder="Observatii, detalii suplimentare..."
              className="form-input resize-none"
            />
          </div>

          {/* Total */}
          <div className="flex justify-between items-center py-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500">Total estimat:</span>
            <span className="text-lg font-bold text-brand">{total.toFixed(2)} RON</span>
          </div>

          {formError && (
            <p className="text-sm text-red-500 text-center -mb-1">{formError}</p>
          )}
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
