import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  CATEGORIES, deleteExpense, listExpenses, saveExpense, supabase, supabaseConfigured,
  type Expense, type ExpenseInput,
} from './lib/supabase'
import { shiftMonth, summarize, yen } from './lib/summary'
import { tesseractReader } from './ocr/tesseractReader'
import type { ReceiptReader } from './ocr/types'

const reader: ReceiptReader = tesseractReader
const today = () => new Date().toLocaleDateString('sv-SE')

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!supabaseConfigured) return <main className="wrap"><p className="err">Supabase の設定（環境変数）がありません。</p></main>
  if (!ready) return <main className="wrap"><p>読み込み中…</p></main>
  return session ? <Ledger email={session.user.email ?? ''} /> : <Login />
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const redirect = window.location.origin + import.meta.env.BASE_URL
  const run = async (fn: () => Promise<{ error: Error | null }>, ok: string) => {
    setBusy(true); setMsg('')
    const { error } = await fn()
    setBusy(false); setMsg(error ? `エラー: ${error.message}` : ok)
  }
  return (
    <main className="wrap">
      <h1>レシート家計簿</h1>
      <form className="card" onSubmit={(e) => { e.preventDefault(); run(() => supabase.auth.signInWithPassword({ email, password }), '') }}>
        <label>メールアドレス<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>パスワード<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <button className="primary" disabled={busy || !password}>ログイン</button>
        <button type="button" disabled={busy || !email || password.length < 6}
          onClick={() => run(() => supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirect } }), '確認メールを送りました。メール内のリンクを開くと登録が完了します。')}>
          この内容で新規登録
        </button>
        <button type="button" className="link" disabled={busy || !email}
          onClick={() => run(() => supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } }), 'ログイン用リンクをメールで送りました。')}>
          パスワードなしでメールのリンクでログイン
        </button>
        {msg && <p className="msg">{msg}</p>}
      </form>
    </main>
  )
}

type Draft = ExpenseInput & { id?: string }
const emptyDraft = (): Draft => ({ date: today(), store: '', amount: 0, category: '食費', note: '' })

function Ledger({ email }: { email: string }) {
  const [month, setMonth] = useState(today().slice(0, 7))
  const [items, setItems] = useState<Expense[]>([])
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [ocr, setOcr] = useState<{ progress: number; text?: string } | null>(null)

  const load = useCallback(async () => {
    try { setItems(await listExpenses(month)); setError('') } catch (e) { setError(String((e as Error).message)) }
  }, [month])
  useEffect(() => { load() }, [load])

  const onFile = async (file?: File) => {
    if (!file) return
    setOcr({ progress: 0 }); setDraft(null)
    try {
      const { text, parsed } = await reader.read(file, (p) => setOcr({ progress: p }))
      setOcr({ progress: 1, text })
      setDraft({ ...emptyDraft(), date: parsed.date ?? today(), store: parsed.store ?? '', amount: parsed.amount ?? 0 })
    } catch (e) {
      setOcr(null); setError(`読み取りに失敗しました: ${(e as Error).message}`); setDraft(emptyDraft())
    }
  }

  const { total, categories } = summarize(items)

  return (
    <main className="wrap">
      <header className="top">
        <h1>レシート家計簿</h1>
        <button className="link" onClick={() => supabase.auth.signOut()} title={email}>ログアウト</button>
      </header>

      <section className="card actions">
        <label className="primary big">
          📷 レシートを撮る / 選ぶ
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <button onClick={() => { setOcr(null); setDraft(emptyDraft()) }}>✏️ 手入力</button>
        {ocr && ocr.progress < 1 && <p className="msg">読み取り中… {Math.round(ocr.progress * 100)}%（初回は言語データの読み込みに時間がかかります）</p>}
      </section>

      {draft && (
        <ExpenseForm draft={draft} ocrText={ocr?.text}
          onCancel={() => { setDraft(null); setOcr(null) }}
          onSave={async (d) => {
            const { id, ...input } = d
            try { await saveExpense(input, id); setDraft(null); setOcr(null); setMonth(d.date.slice(0, 7)); await load() }
            catch (e) { setError(`保存に失敗しました: ${(e as Error).message}`) }
          }} />
      )}

      {error && <p className="err">{error}</p>}

      <section className="card">
        <div className="month">
          <button onClick={() => setMonth(shiftMonth(month, -1))}>◀</button>
          <strong>{month.replace('-', '年')}月</strong>
          <button onClick={() => setMonth(shiftMonth(month, 1))}>▶</button>
        </div>
        <p className="total">{yen(total)}</p>
        {categories.map(([c, v]) => (
          <div key={c} className="bar">
            <span>{c}</span>
            <div><i style={{ width: `${total ? (v / total) * 100 : 0}%` }} /></div>
            <span>{yen(v)}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>明細</h2>
        {items.length === 0 && <p className="muted">この月の記録はまだありません。</p>}
        <ul className="list">
          {items.map((it) => (
            <li key={it.id}>
              <div onClick={() => { setOcr(null); setDraft({ ...it }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                <small>{it.date.slice(5).replace('-', '/')} ・ {it.category}</small>
                <span>{it.store || '（店名なし）'}{it.note && <small> — {it.note}</small>}</span>
              </div>
              <b>{yen(it.amount)}</b>
              <button className="link" aria-label="削除" onClick={async () => {
                if (!confirm(`${it.store || 'この記録'} ${yen(it.amount)} を削除しますか？`)) return
                try { await deleteExpense(it.id); await load() } catch (e) { setError((e as Error).message) }
              }}>🗑</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

function ExpenseForm({ draft, ocrText, onSave, onCancel }: {
  draft: Draft; ocrText?: string; onSave: (d: Draft) => void; onCancel: () => void
}) {
  const [d, setD] = useState(draft)
  useEffect(() => setD(draft), [draft])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v })
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); onSave(d) }}>
      <h2>{d.id ? '記録を編集' : ocrText !== undefined ? '読み取り結果を確認' : '手入力'}</h2>
      {ocrText !== undefined && <p className="muted">読み取り結果は間違っていることがあります。確認して直してから保存してください。</p>}
      <label>日付<input type="date" required value={d.date} onChange={(e) => set('date', e.target.value)} /></label>
      <label>店名<input value={d.store} onChange={(e) => set('store', e.target.value)} /></label>
      <label>金額（円）<input type="number" inputMode="numeric" min={0} required value={d.amount || ''} onChange={(e) => set('amount', Number(e.target.value))} /></label>
      <label>カテゴリ
        <select value={d.category} onChange={(e) => set('category', e.target.value)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>メモ<input value={d.note} onChange={(e) => set('note', e.target.value)} /></label>
      <div className="row">
        <button type="button" onClick={onCancel}>キャンセル</button>
        <button className="primary">保存</button>
      </div>
      {ocrText && <details><summary>読み取った文字を見る</summary><pre>{ocrText}</pre></details>}
    </form>
  )
}
