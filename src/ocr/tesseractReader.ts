import { parseReceipt } from '../lib/parseReceipt'
import type { ReceiptReader } from './types'

/** 画像を縮小・グレースケール化して認識精度と速度を上げる */
async function preprocess(image: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(image)
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.filter = 'grayscale(1) contrast(1.4)'
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return await new Promise((res) => canvas.toBlob((b) => res(b ?? image), 'image/png'))
}

export const tesseractReader: ReceiptReader = {
  name: 'Tesseract.js（端末内）',
  async read(image, onProgress) {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker(['jpn', 'eng'], 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') onProgress?.(m.progress)
      },
    })
    try {
      const input = await preprocess(image).catch(() => image)
      const { data } = await worker.recognize(input)
      return { text: data.text, parsed: parseReceipt(data.text) }
    } finally {
      await worker.terminate()
    }
  },
}
