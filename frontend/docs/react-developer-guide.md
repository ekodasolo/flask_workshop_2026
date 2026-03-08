# React 開発ガイド — Book Review フロントエンド

このドキュメントでは、Book Review フロントエンドアプリの仕組みを React 初心者向けに解説します。

---

## 目次

1. [アプリ全体の構造](#1-アプリ全体の構造)
2. [データの流れ](#2-データの流れ)
3. [型定義（types.ts）](#3-型定義typests)
4. [API クライアント（api.ts / mock.ts）](#4-api-クライアントapits--mockts)
5. [App コンポーネント（App.tsx）](#5-app-コンポーネントapptsx)
6. [ページコンポーネント](#6-ページコンポーネント)
7. [UI コンポーネント](#7-ui-コンポーネント)
8. [使われている React の機能まとめ](#8-使われている-react-の機能まとめ)

---

## 1. アプリ全体の構造

### コンポーネントツリー

```
App
├── header（API URL 設定・モックモードバッジ）
├── main
│   ├── BooksPage（"/" のとき表示）
│   │   ├── BookForm        ← 書籍登録フォーム
│   │   └── BookList         ← 書籍一覧
│   │       └── BookCard     ← 個々の書籍カード
│   │
│   └── BookDetailPage（"/books/:id" のとき表示）
│       ├── BookDetail       ← 書籍情報の表示・編集
│       ├── ReviewForm       ← レビュー投稿フォーム
│       └── ReviewList       ← レビュー一覧
│           └── ReviewCard   ← 個々のレビューカード
└── footer
```

### ファイル分類

| 分類 | ファイル | 役割 |
|------|---------|------|
| 型定義 | `types.ts` | Book, Review などの TypeScript 型 |
| API 層 | `api.ts`, `mock.ts` | バックエンドとの通信、モックデータ |
| ルート | `App.tsx` | ルーティング、ヘッダー、フッター |
| ページ | `pages/BooksPage.tsx` | 書籍一覧画面（データ取得・状態管理） |
| ページ | `pages/BookDetailPage.tsx` | 書籍詳細画面（データ取得・状態管理） |
| UI 部品 | `components/Book*.tsx` | 書籍関連の表示・入力コンポーネント |
| UI 部品 | `components/Review*.tsx` | レビュー関連の表示・入力コンポーネント |

---

## 2. データの流れ

React アプリでは **データは親から子へ一方向に流れます**（単方向データフロー）。

### 書籍一覧画面の例

```
BooksPage（データを持つ親）
  │
  │  books 配列を props で渡す
  ▼
BookList
  │
  │  book オブジェクトを props で渡す
  ▼
BookCard（表示するだけ）
```

### イベント（操作）の流れ

ユーザーの操作は **コールバック関数を通じて子から親へ伝わります**。

```
BookCard で「クリック」
  │
  │  onClick(book_id) を呼ぶ
  ▼
BookList の onSelect が呼ばれる
  │
  │  onSelect(book_id) を呼ぶ
  ▼
BooksPage の handleSelect が呼ばれる
  │
  │  navigate(`/books/${bookId}`) で画面遷移
  ▼
BookDetailPage が表示される
```

このパターン（**データは下へ、イベントは上へ**）は React の基本です。

---

## 3. 型定義（types.ts）

TypeScript の型を定義しています。API のレスポンスとリクエストで型を分けています。

```typescript
// API から返ってくる書籍データ（book_id や created_at を含む）
export type Book = {
  book_id: string;
  title: string;
  author: string;
  description: string;
  created_at: string;
};

// 書籍を登録・更新するときに送るデータ（book_id は不要）
export type BookInput = {
  title: string;
  author: string;
  description: string;
};
```

**ポイント**: `Book` は API が返す完全なデータ、`BookInput` はユーザーが入力する項目だけ。`book_id` や `created_at` はサーバー側で生成されるので `BookInput` には含みません。

---

## 4. API クライアント（api.ts / mock.ts）

### api.ts — API 呼び出しの窓口

```typescript
// 実際の API を呼び出すオブジェクト
const realApi = {
  getBooks: async (): Promise<{ books: Book[] }> => {
    const res = await fetch(`${getBaseUrl()}/api/v1/books`);
    if (!res.ok) throw new Error('Failed to fetch books');
    return res.json();
  },
  // ... 他のメソッドも同様
};
```

各メソッドは `fetch()` で HTTP リクエストを送り、JSON レスポンスを返します。

### Proxy によるモック切り替え

```typescript
export const api = new Proxy(realApi, {
  get(target, prop: keyof typeof realApi) {
    return isMockMode() ? mockApi[prop] : target[prop];
  },
});
```

`api.getBooks()` と呼ぶと、API URL が設定されていれば `realApi.getBooks()` が、未設定なら `mockApi.getBooks()` が呼ばれます。呼び出し側は切り替えを意識する必要がありません。

### mock.ts — モックデータ

バックエンドなしで動作確認するためのモック実装です。メモリ上の配列を操作し、`delay()` で API 呼び出しの遅延を再現しています。

---

## 5. App コンポーネント（App.tsx）

アプリのルート（最上位）コンポーネントです。

### 使っている hooks

| hook | 用途 |
|------|------|
| `useState` | API URL の入力値を管理 |

### 処理の流れ

1. `useState` で API URL を `localStorage` または環境変数から初期化
2. URL 入力が変わったら `localStorage` に保存（ページを開き直しても維持される）
3. `<Routes>` で URL パスに応じたページコンポーネントを切り替え

### ルーティング

```typescript
<Routes>
  <Route path="/" element={<BooksPage />} />
  <Route path="/books/:id" element={<BookDetailPage />} />
</Routes>
```

| URL パス | 表示されるページ | 説明 |
|----------|----------------|------|
| `/` | `BooksPage` | 書籍一覧 |
| `/books/:id` | `BookDetailPage` | 書籍詳細（`:id` は実際の book_id に置き換わる） |

---

## 6. ページコンポーネント

ページコンポーネントは **データの取得と状態管理** を担当します。取得したデータは props で子コンポーネントに渡します。

### BooksPage（書籍一覧画面）

**ファイル**: `pages/BooksPage.tsx`

#### 使っている hooks

| hook | 用途 |
|------|------|
| `useState<Book[]>` | 書籍一覧データ |
| `useState<boolean>` | ローディング中かどうか |
| `useState<string \| null>` | エラーメッセージ |
| `useEffect` | 画面表示時に API を呼ぶ |
| `useNavigate` | 画面遷移（React Router） |

#### 処理の流れ

```
画面表示
  │
  ▼
useEffect が発火 → fetchBooks() を呼ぶ
  │
  ├─ setLoading(true)
  ├─ api.getBooks() で書籍一覧を取得
  ├─ setBooks(data.books) で状態を更新
  └─ setLoading(false)
  │
  ▼
books を BookList に渡して表示
```

#### 子に渡す props とコールバック

```typescript
<BookForm onSubmit={handleCreate} />
<BookList books={books} onSelect={handleSelect} />
```

| 渡す先 | props | 内容 |
|--------|-------|------|
| `BookForm` | `onSubmit` | フォーム送信時に `api.createBook()` を呼び、一覧を再取得 |
| `BookList` | `books` | 書籍データの配列 |
| `BookList` | `onSelect` | カードクリック時に `/books/:id` へ遷移 |

---

### BookDetailPage（書籍詳細画面）

**ファイル**: `pages/BookDetailPage.tsx`

#### 使っている hooks

| hook | 用途 |
|------|------|
| `useState<Book \| null>` | 書籍データ |
| `useState<Review[]>` | レビュー一覧データ |
| `useState<boolean>` | ローディング中かどうか |
| `useState<string \| null>` | エラーメッセージ |
| `useEffect` | URL の id が変わったら API を呼ぶ |
| `useParams` | URL の `:id` パラメータを取得（React Router） |
| `useNavigate` | 画面遷移（React Router） |

#### 処理の流れ

```
画面表示（URL: /books/abc-123）
  │
  ▼
useParams() で id = "abc-123" を取得
  │
  ▼
useEffect が発火 → fetchData() を呼ぶ
  │
  ├─ Promise.all で並列取得:
  │   ├─ api.getBook(id)      → 書籍データ
  │   └─ api.getReviews(id)   → レビュー一覧
  ├─ setBook(bookData)
  └─ setReviews(reviewsData.reviews)
  │
  ▼
book を BookDetail に、reviews を ReviewList に渡して表示
```

**ポイント**: `Promise.all` で書籍とレビューを **並列に取得** しています。順番に取得するより速くなります。

#### 子に渡す props とコールバック

| 渡す先 | props | 内容 |
|--------|-------|------|
| `BookDetail` | `book` | 書籍データ |
| `BookDetail` | `onUpdate` | 編集保存時に `api.updateBook()` を呼ぶ |
| `BookDetail` | `onDelete` | 削除時に `api.deleteBook()` → 一覧へ遷移 |
| `ReviewForm` | `bookId` | レビュー対象の書籍 ID |
| `ReviewForm` | `onSubmit` | 投稿時に `api.createReview()` → レビュー再取得 |
| `ReviewList` | `reviews` | レビューデータの配列 |

---

## 7. UI コンポーネント

UI コンポーネントは **表示とユーザー入力** を担当します。API 呼び出しは行わず、受け取った props を表示し、ユーザー操作をコールバックで親に伝えます。

### BookCard — 書籍カード

**ファイル**: `components/BookCard.tsx`

```typescript
type Props = {
  book: Book;            // 表示する書籍データ
  onClick: (bookId: string) => void;  // クリック時のコールバック
};
```

タイトル・著者・紹介文を表示するシンプルなカード。クリックすると `onClick` で親に book_id を伝えます。

---

### BookList — 書籍一覧

**ファイル**: `components/BookList.tsx`

```typescript
type Props = {
  books: Book[];                       // 書籍データの配列
  onSelect: (bookId: string) => void;  // 書籍選択時のコールバック
};
```

`books` 配列を `map()` で回して `BookCard` を並べます。空配列のときは「書籍がまだ登録されていません」と表示します。

**ポイント**: `map()` で要素を並べるとき、`key` に一意な値（ここでは `book.book_id`）を渡す必要があります。React が各要素を効率的に更新するために使います。

---

### BookForm — 書籍登録フォーム

**ファイル**: `components/BookForm.tsx`

```typescript
type Props = {
  onSubmit: (book: BookInput) => void;  // 送信時のコールバック
};
```

#### 使っている hooks

| hook | 用途 |
|------|------|
| `useState` x3 | タイトル・著者・紹介文の入力値 |

#### 処理の流れ

```
ユーザーがフォームに入力
  │
  │  onChange で useState が更新される
  ▼
「登録」ボタンを押す
  │
  ▼
handleSubmit が呼ばれる
  │
  ├─ e.preventDefault() でページリロードを防ぐ
  ├─ 入力値を確認（空なら何もしない）
  ├─ onSubmit({ title, author, description }) で親に通知
  └─ 入力欄をクリア（setState で空文字に）
```

**`e.preventDefault()` とは**: HTML の `<form>` はデフォルトで送信時にページをリロードします。React ではリロードせず JavaScript で処理するため、この挙動を止めています。

---

### BookDetail — 書籍詳細表示・編集

**ファイル**: `components/BookDetail.tsx`

```typescript
type Props = {
  book: Book;                           // 書籍データ
  onUpdate: (book: BookInput) => void;  // 更新時のコールバック
  onDelete: (bookId: string) => void;   // 削除時のコールバック
};
```

#### 使っている hooks

| hook | 用途 |
|------|------|
| `useState<boolean>` | 編集モード ON/OFF |
| `useState` x3 | タイトル・著者・紹介文の編集値 |

#### 表示モードと編集モードの切り替え

このコンポーネントは `isEditing` の値によって **2 つの表示を切り替えます**。

```
isEditing === false（表示モード）
  ┌─────────────────────────┐
  │ Clean Code              │
  │ Robert C. Martin        │
  │ 読みやすいコードの...     │
  │ [編集] [削除]            │
  └─────────────────────────┘
       │ 「編集」をクリック
       ▼
isEditing === true（編集モード）
  ┌─────────────────────────┐
  │ [タイトル入力欄         ]│
  │ [著者入力欄             ]│
  │ [紹介文入力欄           ]│
  │ [保存] [キャンセル]      │
  └─────────────────────────┘
```

「保存」を押すと `onUpdate` で親に更新データを伝え、「キャンセル」を押すと編集モードを解除します。

---

### ReviewCard — レビューカード

**ファイル**: `components/ReviewCard.tsx`

```typescript
type Props = {
  review: Review;  // 表示するレビューデータ
};
```

hooks なし、コールバックなし。純粋にデータを受け取って表示するだけのコンポーネントです。

星の表示は文字列の繰り返しで実現しています:

```typescript
{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
// rating=4 の場合 → "★★★★☆"
```

---

### ReviewList — レビュー一覧

**ファイル**: `components/ReviewList.tsx`

```typescript
type Props = {
  reviews: Review[];  // レビューデータの配列
};
```

BookList と同じパターン。`map()` で `ReviewCard` を並べ、空なら「レビューはまだありません」を表示します。

---

### ReviewForm — レビュー投稿フォーム

**ファイル**: `components/ReviewForm.tsx`

```typescript
type Props = {
  bookId: string;                           // 対象書籍の ID
  onSubmit: (review: ReviewInput) => void;  // 送信時のコールバック
};
```

#### 使っている hooks

| hook | 用途 |
|------|------|
| `useState` x3 | レビュアー名・評価・コメントの入力値 |

BookForm と同じパターンのフォームです。評価（rating）は `<select>` で 1〜5 を選択します。

---

## 8. 使われている React の機能まとめ

### useState — 状態管理

```typescript
const [books, setBooks] = useState<Book[]>([]);
```

コンポーネント内でデータを保持する仕組みです。`setBooks(newValue)` を呼ぶと値が更新され、**画面が自動的に再描画されます**。

このアプリでは主に 3 種類の状態を管理しています:

| 状態の種類 | 例 | 目的 |
|-----------|----|----|
| データ | `books`, `reviews`, `book` | API から取得した表示データ |
| UI 状態 | `loading`, `isEditing` | 表示の切り替え |
| フォーム入力 | `title`, `author`, `reviewer` | ユーザーの入力値 |

### useEffect — 副作用

```typescript
useEffect(() => {
  fetchBooks();
}, []);
```

「画面が表示されたとき」や「特定の値が変わったとき」に処理を実行します。

| 第 2 引数 | 意味 | このアプリでの用途 |
|-----------|------|------------------|
| `[]`（空配列） | 初回表示時に 1 回だけ実行 | BooksPage の書籍一覧取得 |
| `[id]` | `id` が変わるたびに実行 | BookDetailPage の書籍・レビュー取得 |

### useNavigate — 画面遷移（React Router）

```typescript
const navigate = useNavigate();
navigate(`/books/${bookId}`);  // 書籍詳細画面へ移動
navigate('/');                  // 書籍一覧画面へ移動
```

ページ全体をリロードせずに URL を変えて画面を切り替えます。

### useParams — URL パラメータ取得（React Router）

```typescript
const { id } = useParams<{ id: string }>();
```

URL の `/books/:id` 部分から実際の ID を取り出します。例えば URL が `/books/abc-123` なら `id` は `"abc-123"` になります。

---

## 補足: コンポーネント設計のパターン

このアプリは 2 種類のコンポーネントに分かれています。

### ページコンポーネント（Container）

- `BooksPage`, `BookDetailPage`
- API を呼ぶ、状態を管理する、エラーを処理する
- 取得したデータを子コンポーネントに渡す

### UI コンポーネント（Presentational）

- `BookCard`, `BookList`, `BookForm`, `BookDetail`, `ReviewCard`, `ReviewList`, `ReviewForm`
- props で受け取ったデータを表示する
- ユーザー操作をコールバック（`onSubmit`, `onClick` など）で親に伝える
- API を直接呼ばない

この分離により、UI コンポーネントは再利用しやすく、テストも簡単になります。
