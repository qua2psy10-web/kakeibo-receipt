export interface ParsedReceipt {
  date: string | null // YYYY-MM-DD
  store: string | null
  amount: number | null
}

/** 全角→半角、数字間の空白除去などOCR結果の正規化 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[￥\\]/g, '¥')
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/(?<=\d)[ \t]+(?=[,.])/g, '')
        .replace(/(?<=[,.])[ \t]+(?=\d)/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim(),
    )
    .filter((l) => l.length > 0)
    .join('\n')
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function validDate(y: number, m: number, d: number): string | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCMonth() !== m - 1) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

export function extractDate(text: string): string | null {
  const t = normalizeText(text).replace(/ ?([年月日./-]) ?/g, '$1')
  // 令和
  const reiwa = t.match(/(?:令和|R)(\d{1,2}|元)[年./-](\d{1,2})[月./-](\d{1,2})/)
  if (reiwa) {
    const n = reiwa[1] === '元' ? 1 : Number(reiwa[1])
    const r = validDate(2018 + n, Number(reiwa[2]), Number(reiwa[3]))
    if (r) return r
  }
  const full = t.match(/(20\d{2})[年./-](\d{1,2})[月./-](\d{1,2})/)
  if (full) {
    const r = validDate(Number(full[1]), Number(full[2]), Number(full[3]))
    if (r) return r
  }
  const short = t.match(/(?<!\d)(\d{2})[./-](\d{1,2})[./-](\d{1,2})(?!\d)/)
  if (short) {
    const r = validDate(2000 + Number(short[1]), Number(short[2]), Number(short[3]))
    if (r) return r
  }
  return null
}

const TOTAL_KEYWORDS = /(合計|お会計|御会計|総計|総合計|税込|お買上|お買い上げ|ご請求|請求額|お支払|TOTAL)/i
const EXCLUDE_KEYWORDS = /(小計|お預り|お預かり|預り|釣|おつり|対象|消費税|内税|外税|ポイント|点数|個数)/

/** 行に含まれる金額候補を抽出 */
export function amountsInLine(line: string): number[] {
  const out: number[] = []
  const re = /¥?\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\s?円)?/g
  for (const m of line.matchAll(re)) {
    const n = Number(m[1].replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0 && n < 10_000_000) out.push(n)
  }
  return out
}

export function extractAmount(text: string): number | null {
  const lines = normalizeText(text).split('\n')
  const candidates: number[] = []
  lines.forEach((line, i) => {
    if (!TOTAL_KEYWORDS.test(line)) return
    if (EXCLUDE_KEYWORDS.test(line) && !/合計/.test(line.replace(/小計/g, ''))) return
    let nums = amountsInLine(line.replace(/\d+%/g, ''))
    if (nums.length === 0 && i + 1 < lines.length) nums = amountsInLine(lines[i + 1])
    candidates.push(...nums)
  })
  if (candidates.length > 0) return Math.max(...candidates)
  // フォールバック: ¥ か 円 付きの最大額
  const yen: number[] = []
  for (const line of lines) {
    if (EXCLUDE_KEYWORDS.test(line)) continue
    for (const m of line.matchAll(/¥\s?(\d{1,3}(?:,\d{3})+|\d+)|(\d{1,3}(?:,\d{3})+|\d+)\s?円/g)) {
      yen.push(Number((m[1] ?? m[2]).replace(/,/g, '')))
    }
  }
  return yen.length > 0 ? Math.max(...yen) : null
}

const STORE_SKIP = /(領収|レシート|receipt|TEL|電話|〒|登録番号|^\d|^[-=*_\s]+$|ありがとう|いらっしゃい)/i

export function extractStore(text: string): string | null {
  const lines = normalizeText(text).split('\n').slice(0, 6)
  for (const line of lines) {
    if (STORE_SKIP.test(line)) continue
    if (extractDate(line)) continue
    const letters = line.replace(/[\d\s\p{P}\p{S}]/gu, '')
    if (letters.length >= 2) return line.slice(0, 40)
  }
  return null
}

export function parseReceipt(text: string): ParsedReceipt {
  return { date: extractDate(text), store: extractStore(text), amount: extractAmount(text) }
}
