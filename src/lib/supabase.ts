import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing')

export const CATEGORIES = ['食費', '外食', '日用品', '交通', '医療', '娯楽', 'その他'] as const

export interface Expense {
  id: string
  date: string
  store: string
  amount: number
  category: string
  note: string
  created_at?: string
}
export type ExpenseInput = Omit<Expense, 'id' | 'created_at'>

export async function listExpenses(month: string): Promise<Expense[]> {
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  const { data, error } = await supabase
    .from('expenses')
    .select('id,date,store,amount,category,note,created_at')
    .gte('date', `${month}-01`)
    .lt('date', next)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Expense[]
}

export async function saveExpense(input: ExpenseInput, id?: string): Promise<void> {
  const q = id ? supabase.from('expenses').update(input).eq('id', id) : supabase.from('expenses').insert(input)
  const { error } = await q
  if (error) throw error
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}
