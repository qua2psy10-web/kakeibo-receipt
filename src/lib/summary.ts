export function summarize(items: { amount: number; category: string }[]) {
  const byCategory = new Map<string, number>()
  let total = 0
  for (const it of items) {
    total += it.amount
    byCategory.set(it.category, (byCategory.get(it.category) ?? 0) + it.amount)
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1])
  return { total, categories }
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`
