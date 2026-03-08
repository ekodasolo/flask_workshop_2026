# Book Review フロントエンド

Flask + DynamoDB ワークショップで構築する Book Review API のフロントエンドアプリケーションです。

## 技術スタック

- React 19 + TypeScript
- React Router v7
- Vite 7

## 機能

- **書籍一覧** — 登録済み書籍の一覧表示・新規登録
- **書籍詳細** — 書籍情報の表示・編集・削除
- **レビュー** — 書籍に対するレビューの一覧表示・投稿

## モックモード

API URL が未設定の場合、モックモードで動作します。バックエンドなしで画面の動作を確認できます。

ヘッダー右側の「API URL」欄にバックエンドの URL（例: `http://localhost:5000/api/v1`）を入力すると、実際の API に接続します。

## 起動方法

```bash
npm install
npm run dev
```

http://localhost:5173 でアクセスできます。

## ディレクトリ構成

```
src/
├── api.ts          # API クライアント（モック/実 API の切り替え）
├── mock.ts         # モックデータ・モック API 実装
├── types.ts        # 型定義（Book, Review など）
├── App.tsx         # ルーティング・ヘッダー・フッター
├── App.css         # コンポーネントスタイル
├── index.css       # グローバルスタイル
├── pages/
│   ├── BooksPage.tsx       # 書籍一覧ページ
│   └── BookDetailPage.tsx  # 書籍詳細ページ
└── components/
    ├── BookCard.tsx     # 書籍カード
    ├── BookList.tsx     # 書籍一覧
    ├── BookForm.tsx     # 書籍登録フォーム
    ├── BookDetail.tsx   # 書籍詳細表示・編集
    ├── ReviewCard.tsx   # レビューカード
    ├── ReviewList.tsx   # レビュー一覧
    └── ReviewForm.tsx   # レビュー投稿フォーム
```

## ビルド

```bash
npm run build
```

`dist/` ディレクトリに静的ファイルが出力されます。Amplify などにデプロイできます。
