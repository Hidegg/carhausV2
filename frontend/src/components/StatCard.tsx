import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface Props {
  label: string
  value: string | number
  sub?: string
  trend?: number
  icon?: ReactNode
  index?: number
}

export default function StatCard({ label, value, sub, trend, icon, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="card p-4"
    >
      <div className="flex items-start justify-between">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-brand opacity-60">{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-brand mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      {trend !== undefined && (
        <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-400'}`}>
          {trend >= 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(0) : trend} vs anterior
        </p>
      )}
    </motion.div>
  )
}
