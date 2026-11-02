import { describe, expect, it } from 'vitest'
import { shiftMonth, summarize } from './summary'

describe('summarize', () => {
  it('月合計とカテゴリ別（多い順）', () => {
    expect(
      summarize([
        { amount: 300, category: '食費' },
        { amount: 1000, category: '外食' },
        { amount: 200, category: '食費' },
      ]),
    ).toEqual({ total: 1500, categories: [['外食', 1000], ['食費', 500]] })
  })
})

describe('shiftMonth', () => {
  it('年をまたぐ', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
})
