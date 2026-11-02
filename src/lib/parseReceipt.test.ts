import { describe, expect, it } from 'vitest'
import { amountsInLine, extractAmount, extractDate, extractStore, normalizeText, parseReceipt } from './parseReceipt'

const sample = `スーパーみどり 新宿店
TEL 03-1234-5678
2026年10月31日(土) 18:42
牛乳 ¥198
食パン ¥158
小計 ¥356
消費税等(8%) ¥28
合計 ¥384
お預り ¥1,000
お釣り ¥616`

describe('normalizeText', () => {
  it('全角数字を半角にし数字間の空白を詰める', () => {
    expect(normalizeText('合計　￥１, ２３４')).toBe('合計 ¥1,234')
  })
})

describe('extractDate', () => {
  it('西暦の年月日', () => expect(extractDate('2026年10月31日')).toBe('2026-10-31'))
  it('スラッシュ区切り', () => expect(extractDate('日時 2026/1/5 12:00')).toBe('2026-01-05'))
  it('令和', () => expect(extractDate('令和8年3月1日')).toBe('2026-03-01'))
  it('令和元年', () => expect(extractDate('令和元年5月1日')).toBe('2019-05-01'))
  it('2桁年', () => expect(extractDate('26.11.02 10:11')).toBe('2026-11-02'))
  it('存在しない日付は無視', () => expect(extractDate('2026/2/30')).toBeNull())
  it('見つからない', () => expect(extractDate('牛乳 198')).toBeNull())
})

describe('extractAmount', () => {
  it('合計行を優先し、お預り・お釣りを除外', () => expect(extractAmount(sample)).toBe(384))
  it('税込表記', () => expect(extractAmount('小計 1,000\n合計(税込) ¥1,100')).toBe(1100))
  it('お会計の次の行に金額', () => expect(extractAmount('お会計\n¥2,480')).toBe(2480))
  it('税率の%を金額と誤認しない', () => expect(extractAmount('税込合計 10% 550円')).toBe(550))
  it('キーワードがなければ¥付き最大額', () => expect(extractAmount('A ¥120\nB ¥300')).toBe(300))
  it('何もなければnull', () => expect(extractAmount('ありがとうございました')).toBeNull())
  it('amountsInLine', () => expect(amountsInLine('¥1,234 と 56円')).toEqual([1234, 56]))
})

describe('extractStore', () => {
  it('先頭の店名行', () => expect(extractStore(sample)).toBe('スーパーみどり 新宿店'))
  it('領収書の見出しを飛ばす', () => expect(extractStore('領収書\nカフェ青空\n2026/1/1')).toBe('カフェ青空'))
})

describe('parseReceipt', () => {
  it('まとめて抽出', () =>
    expect(parseReceipt(sample)).toEqual({ date: '2026-10-31', store: 'スーパーみどり 新宿店', amount: 384 }))
})
