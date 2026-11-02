# レシート家計簿

レシートを撮影すると、端末内の OCR（Tesseract.js）で日付・店名・合計金額を読み取り、確認・修正してから家計簿に保存できる個人用 PWA です。iPhone と Mac のどちらでも使え、データは Supabase で同期されます。

公開URL: https://qua2psy10-web.github.io/kakeibo-receipt/

## できること
- レシートを撮る／画像を選ぶ → 端末内 OCR → 読み取り結果を編集して保存
- 手入力での登録
- 明細一覧（タップで編集、🗑で削除）
- 月ごとの合計とカテゴリ別集計（食費・外食・日用品・交通・医療・娯楽・その他）
- メール＋パスワード、またはメールのリンクでログイン（行レベルセキュリティで自分のデータだけ見える）
- レシート画像はクラウドに保存しません（読み取った値だけを保存）

## ホーム画面への追加
- **iPhone**: Safari で公開URLを開く → 共有ボタン →「ホーム画面に追加」
- **Mac**: Safari で開く →「ファイル」→「Dock に追加」（Chrome ならアドレスバーのインストールアイコン）

## 開発
```sh
corepack pnpm install
corepack pnpm dev     # 開発サーバー
corepack pnpm test    # テスト（vitest）
corepack pnpm build   # ビルド
```

`.env` の `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` は公開前提の値（publishable key）です。サービスロールキーは絶対にコミットしないでください。

## 構成
- `src/lib/parseReceipt.ts` … OCR テキストから日付・店名・金額を推定する純粋関数（テストあり）
- `src/ocr/` … 読み取りエンジンのインターフェース（`ReceiptReader`）と Tesseract.js 実装。AI 画像認識 API に差し替える場合は同じインターフェースで実装を追加
- `src/lib/supabase.ts` … Supabase クライアントと `expenses` テーブルの操作
- `supabase/migrations/` … テーブルと RLS ポリシーの定義
- `.github/workflows/deploy.yml` … main への push で GitHub Pages に自動デプロイ
