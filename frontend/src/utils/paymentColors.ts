export const PAYMENT_COLORS: Record<string, { bg: string; badge: string; text: string }> = {
  CASH:     { bg: 'bg-green-500',  badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',  text: 'text-green-600' },
  CARD:     { bg: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',     text: 'text-blue-600' },
  CURS:     { bg: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', text: 'text-yellow-600' },
  CONTRACT: { bg: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', text: 'text-purple-600' },
  PROTOCOL: { bg: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', text: 'text-orange-600' },
}
