import type { ParsedReceipt } from '../lib/parseReceipt'

/** レシート読み取りエンジンの共通インターフェース（将来AI画像認識APIに差し替え可能） */
export interface ReceiptReader {
  readonly name: string
  read(image: Blob, onProgress?: (ratio: number) => void): Promise<{ text: string; parsed: ParsedReceipt }>
}
