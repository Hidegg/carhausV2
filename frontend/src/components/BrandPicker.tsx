import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Plus, ArrowLeft } from 'lucide-react'
import brandsData from '../data/carBrands.json'
import europeanBrands from '../data/europeanBrands'

interface Brand { name: string; slug: string; image?: { thumb?: string } }

const STORAGE_KEY = 'carhaus_custom_brands'

const logoMap: Record<string, string> = {}
for (const b of brandsData as Array<{ slug: string; image?: { thumb?: string } }>) {
  if (b.image?.thumb) logoMap[b.slug] = b.image.thumb
}

const curatedWithLogos: Brand[] = europeanBrands.map(b => ({
  ...b,
  image: logoMap[b.slug] ? { thumb: logoMap[b.slug] } : undefined
}))

const fullDataset: Brand[] = (brandsData as Brand[])

// Brands in full dataset but NOT in curated list
const remainingDataset: Brand[] = fullDataset.filter(
  b => !curatedWithLogos.some(c => c.slug === b.slug)
)

function getCustomBrands(): Brand[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveCustomBrands(brands: Brand[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(brands))
}

// ── Sub-modal: Add brand ────────────────────────────────────────────────────

interface AddModalProps {
  custom: Brand[]
  onAdd: (brand: Brand) => void
  onClose: () => void
}

function AddModal({ custom, onAdd, onClose }: AddModalProps) {
  const [tab, setTab] = useState<'list' | 'manual'>('list')
  const [search, setSearch] = useState('')
  const [manualName, setManualName] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const manualRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tab === 'list') searchRef.current?.focus()
    else manualRef.current?.focus()
  }, [tab])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const alreadyAdded = [...curatedWithLogos, ...custom]
  const available = remainingDataset.filter(
    b => !alreadyAdded.some(c => c.slug === b.slug)
  )
  const filtered = search.trim()
    ? available.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : available

  const handleManualAdd = () => {
    const name = manualName.trim()
    if (!name) return
    const existing = fullDataset.find(b => b.name.toLowerCase() === name.toLowerCase())
    const brand: Brand = existing ?? { name, slug: name.toLowerCase().replace(/\s+/g, '-') }
    onAdd(brand)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">Adauga marca</span>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          {([['list', 'Din lista completa'], ['manual', 'Adauga manual']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === key ? 'border-brand text-brand' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'list' && (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cauta in lista completa..."
                className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400" />
            </div>
            <div className="overflow-y-auto scrollbar-hide flex-1 p-4">
              {filtered.length === 0
                ? <p className="text-center text-gray-400 text-sm py-10">Nicio marca gasita.</p>
                : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {filtered.map(brand => (
                      <div key={brand.slug} className="flex flex-col items-center gap-2">
                        <button onClick={() => onAdd(brand)}
                          className="w-full aspect-square flex items-center justify-center p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-brand hover:bg-brand/5 dark:hover:bg-brand/10 transition-all">
                          {brand.image?.thumb ? (
                            <img src={brand.image.thumb} alt={brand.name}
                              className="w-full h-full object-contain"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <span className="text-xl font-bold text-gray-300 dark:text-gray-600">
                              {brand.name.charAt(0)}
                            </span>
                          )}
                        </button>
                        <span className="text-xs font-medium text-center text-gray-600 dark:text-gray-400 leading-tight line-clamp-2 w-full">
                          {brand.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </>
        )}

        {tab === 'manual' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-10">
            <p className="text-sm text-gray-400 text-center">Scrie numele marcii. Va fi salvata permanent in lista ta.</p>
            <input ref={manualRef} value={manualName} onChange={e => setManualName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
              placeholder="ex: Trabant"
              className="w-full max-w-sm text-sm px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand text-center font-semibold uppercase" />
            <button onClick={handleManualAdd}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white text-sm rounded-xl hover:bg-brand-light transition-colors">
              <Plus size={14} /> Adauga
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Main picker ─────────────────────────────────────────────────────────────

interface Props {
  onSelect: (name: string) => void
  onClose: () => void
}

export default function BrandPicker({ onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [custom, setCustom] = useState<Brand[]>(getCustomBrands)
  const [addOpen, setAddOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const baseBrands: Brand[] = [
    ...curatedWithLogos,
    ...custom.filter(c => !curatedWithLogos.some(b => b.name.toLowerCase() === c.name.toLowerCase()))
  ]

  const filtered = search.trim()
    ? fullDataset.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : baseBrands

  useEffect(() => { searchRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (addOpen) setAddOpen(false); else onClose() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [addOpen, onClose])

  const handleAdd = (brand: Brand) => {
    const updated = [...custom, brand]
    setCustom(updated)
    saveCustomBrands(updated)
    onSelect(brand.name.toUpperCase())
    onClose()
  }

  const pick = (name: string) => { onSelect(name.toUpperCase()); onClose() }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cauta marca..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400" />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Grid */}
          <div className="overflow-y-auto scrollbar-hide flex-1 p-4">
            {filtered.length === 0
              ? <p className="text-center text-gray-400 text-sm py-12">Nicio marca gasita.</p>
              : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {filtered.map(brand => (
                    <div key={brand.slug} className="flex flex-col items-center gap-2">
                      <button onClick={() => pick(brand.name)}
                        className="w-full aspect-square flex items-center justify-center p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-brand hover:bg-brand/5 dark:hover:bg-brand/10 transition-all">
                        {brand.image?.thumb ? (
                          <img src={brand.image.thumb} alt={brand.name}
                            className="w-full h-full object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <span className="text-2xl font-bold text-gray-300 dark:text-gray-600">
                            {brand.name.charAt(0)}
                          </span>
                        )}
                      </button>
                      <span className="text-xs font-medium text-center text-gray-600 dark:text-gray-400 leading-tight line-clamp-2 w-full">
                        {brand.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <motion.button
              onClick={() => setAddOpen(true)}
              whileTap={{ scale: 0.88 }}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand text-white md:hover:bg-brand-light md:hover:scale-110 active:scale-90 transition-all"
              title="Adauga marca"
            >
              <Plus size={18} />
            </motion.button>
          </div>
        </motion.div>

        {/* Second modal */}
        <AnimatePresence>
          {addOpen && (
            <AddModal
              custom={custom}
              onAdd={handleAdd}
              onClose={() => setAddOpen(false)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
