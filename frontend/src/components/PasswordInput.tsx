import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export default function PasswordInput({ className = '', ...props }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'}
        className={`${className} pr-9`} />
      <button type="button" tabIndex={-1}
        onClick={() => setVisible(v => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
