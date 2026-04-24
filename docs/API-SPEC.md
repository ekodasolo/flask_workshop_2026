# Book Review API 仕様書

このドキュメントは、ワークショップで開発する Book Review REST API のシステム仕様を定義する。

---

## 概要

### 目的

社内メンバーが読んだ技術書の感想を共有・蓄積するための REST API。書籍の登録・管理と、書籍に対するレビューの投稿・閲覧を提供する。

### 基本機能

| 機能 | 説明 |
|---|---|
| 書籍管理 | 書籍の登録・一覧表示・詳細表示・更新・削除（CRUD） |
| レビュー投稿 | 書籍に対するレビュー（レビュアー名・5段階評価・コメント）の投稿・一覧表示 |

### ユーザーストーリー

1. メンバーが読んだ本を **書籍として登録** する
2. 他のメンバーがその書籍を **一覧から見つけて** 詳細を確認する
3. 読んだことがあるメンバーが **レビューを投稿** する（評価とコメント）
4. レビューを見たメンバーが **次に読む本を選ぶ参考にする**

※サンプルアプリでの動作イメージ：本の一覧を表示し、本をみつける
<img width="784" height="728" alt="image" src="https://github.com/user-attachments/assets/1792b80d-4474-4f09-869a-ce3188a258db" />

※サンプルアプリでの動作イメージ：本のレビューを登録する
<img width="769" height="353" alt="image" src="https://github.com/user-attachments/assets/f6868ef9-f7cb-43f0-82d9-0cf88b4ec199" />

※サンプルアプリでの動作イメージ：本のレビューを参考にする
<img width="779" height="715" alt="image" src="https://github.com/user-attachments/assets/42c20c6b-d6ad-4ecb-ad56-fab507406cfa" />

---

## DynamoDB テーブル設計

### テーブル名とキー設計

**テーブル名:** `book-review-api-workshop`

### キー設計

| PK | SK | 用途 |
|---|---|---|
| `BOOK#<book_id>` | `METADATA` | 書籍レコード |
| `BOOK#<book_id>` | `REVIEW#<review_id>` | レビューレコード |

シングルテーブル設計。1 つのテーブルに書籍とレビューの両方を格納する。

### データの流れ — 具体例で理解する

#### Step 1: 書籍を 2 冊登録する

「Clean Code」と「リーダブルコード」を登録すると、テーブルには以下のアイテムが入る:

| PK | SK | title | author | description | created_at |
|---|---|---|---|---|---|
| `BOOK#aaa-111` | `METADATA` | Clean Code | Robert C. Martin | 読みやすいコードの書き方 | 2024-01-15T10:00:00Z |
| `BOOK#bbb-222` | `METADATA` | リーダブルコード | Dustin Boswell | より良いコードを書くためのテクニック | 2024-01-15T11:00:00Z |

- PK の `BOOK#aaa-111` は `BOOK#` + UUID で構成される
- SK は書籍自体の情報なので固定値 `METADATA`

#### Step 2: 「Clean Code」にレビューを 2 件投稿する

Yohei と Tanaka がレビューを投稿すると、同じテーブルに以下のアイテムが追加される:

| PK | SK | reviewer | rating | comment | created_at |
|---|---|---|---|---|---|
| `BOOK#aaa-111` | `REVIEW#ccc-333` | Yohei | 5 | 実務で即使える内容でした | 2024-01-20T14:00:00Z |
| `BOOK#aaa-111` | `REVIEW#ddd-444` | Tanaka | 4 | 初心者にもおすすめ | 2024-01-21T09:00:00Z |

- PK は書籍と同じ `BOOK#aaa-111`（どの書籍のレビューかを示す）
- SK は `REVIEW#` + UUID で、書籍本体（`METADATA`）と区別する

#### Step 3: この時点でのテーブル全体像

| PK | SK | 主要な属性 |
|---|---|---|
| `BOOK#aaa-111` | `METADATA` | title=Clean Code, author=Robert C. Martin |
| `BOOK#aaa-111` | `REVIEW#ccc-333` | reviewer=Yohei, rating=5 |
| `BOOK#aaa-111` | `REVIEW#ddd-444` | reviewer=Tanaka, rating=4 |
| `BOOK#bbb-222` | `METADATA` | title=リーダブルコード, author=Dustin Boswell |

### アクセスパターンとキーの関係

上記のテーブル内容に対して、各 API がどうデータを取得するかを示す:

| やりたいこと | 操作 | 条件 |
|---|---|---|
| 書籍一覧を取得 | `scan` | SK が `METADATA` のアイテムを抽出 |
| 特定の書籍を取得 | `get_item` | PK=`BOOK#aaa-111`, SK=`METADATA` |
| 書籍のレビュー一覧を取得 | `query` | PK=`BOOK#aaa-111`, SK が `REVIEW#` で始まる |
| 書籍の存在確認 | `get_item` | PK=`BOOK#<id>`, SK=`METADATA` で Item の有無を確認 |

**ポイント**: `query` は PK を指定してそのパーティション内だけを検索するので、`scan`（テーブル全件走査）より効率的。レビュー取得では `begins_with('REVIEW#')` を使うことで、同じ PK の `METADATA` を除外してレビューだけを取得できる。

---

## API エンドポイント

REST API では、**URI（リソースの場所）** と **HTTP メソッド（操作の種類）** の組み合わせで「何に対して何をするか」を表現する。同じ URI でもメソッドが違えば異なる操作になる。

### Books — `/api/v1/books`

書籍リソースに対する CRUD 操作。

| API 操作 | メソッド | パス | DynamoDB 操作 |
|---|---|---|---|
| ListBooks（一覧取得） | GET | `/api/v1/books` | scan |
| CreateBook（新規登録） | POST | `/api/v1/books` | put_item |
| GetBook（詳細取得） | GET | `/api/v1/books/<book_id>` | get_item |
| UpdateBook（更新） | PUT | `/api/v1/books/<book_id>` | update_item |
| DeleteBook（削除） | DELETE | `/api/v1/books/<book_id>` | delete_item |

- `/books` はコレクション（書籍の集合）を指し、一覧取得や新規登録の対象になる
- `/books/<book_id>` は個別のリソースを指し、取得・更新・削除の対象になる

### Reviews — `/api/v1/books/<book_id>/reviews`

レビューは書籍に従属するサブリソース。URI に親リソースの `book_id` を含めることで、どの書籍に対するレビューかを表現する。

| API 操作 | メソッド | パス | DynamoDB 操作 |
|---|---|---|---|
| ListReviews（一覧取得） | GET | `/api/v1/books/<book_id>/reviews` | query + begins_with |
| CreateReview（投稿） | POST | `/api/v1/books/<book_id>/reviews` | put_item |

---

## リクエスト / レスポンス仕様

---

### `GET /api/v1/books`

**リクエスト**
- ボディ: なし

**レスポンス 200**
```json
{
 "books": [
 {
 "book_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 "title": "Clean Code",
 "author": "Robert C. Martin",
 "description": "読みやすいコードの書き方",
 "created_at": "2024-01-15T10:00:00Z"
 }
 ]
}
```

---

### `POST /api/v1/books`

**リクエスト**
```json
{
 "title": "Clean Code",
 "author": "Robert C. Martin",
 "description": "読みやすいコードの書き方"
}
```

| フィールド | 型 | 必須 |
|---|---|---|
| `title` | string | 〇 |
| `author` | string | 〇 |
| `description` | string | 〇 |

**レスポンス 201**
```json
{
 "book_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 "title": "Clean Code",
 "author": "Robert C. Martin",
 "description": "読みやすいコードの書き方",
 "created_at": "2024-01-15T10:00:00Z"
}
```

**レスポンス 400**（必須フィールド欠損）
```json
{ "error": "title, author, description は必須です" }
```

---

### `GET /api/v1/books/<book_id>`

**リクエスト**
- ボディ: なし

**レスポンス 200**
```json
{
 "book_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 "title": "Clean Code",
 "author": "Robert C. Martin",
 "description": "読みやすいコードの書き方",
 "created_at": "2024-01-15T10:00:00Z"
}
```

**レスポンス 404**
```json
{ "error": "Book not found" }
```

---

### `PUT /api/v1/books/<book_id>`

**リクエスト**（変更したいフィールドのみ）
```json
{
 "description": "コードの品質を高めるベストプラクティス集"
}
```

| フィールド | 型 | 必須 |
|---|---|---|
| `title` | string | |
| `author` | string | |
| `description` | string | |

**レスポンス 200**（更新後の書籍オブジェクト）
```json
{
 "book_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 "title": "Clean Code",
 "author": "Robert C. Martin",
 "description": "コードの品質を高めるベストプラクティス集",
 "created_at": "2024-01-15T10:00:00Z"
}
```

**レスポンス 404**
```json
{ "error": "Book not found" }
```

---

### `DELETE /api/v1/books/<book_id>`

**リクエスト**
- ボディ: なし

**レスポンス 200**
```json
{ "message": "Book deleted" }
```

**レスポンス 404**
```json
{ "error": "Book not found" }
```

---

### `GET /api/v1/books/<book_id>/reviews`

**リクエスト**
- ボディ: なし

**レスポンス 200**
```json
{
 "reviews": [
 {
 "review_id": "x9y8z7w6-v5u4-3210-fedc-ba9876543210",
 "book_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 "reviewer": "Yohei",
 "rating": 5,
 "comment": "実務で即使える内容でした",
 "created_at": "2024-01-20T14:00:00Z"
 }
 ]
}
```

**レスポンス 404**（書籍が存在しない場合）
```json
{ "error": "Book not found" }
```

---

### `POST /api/v1/books/<book_id>/reviews`

**リクエスト**
```json
{
 "reviewer": "Yohei",
 "rating": 5,
 "comment": "実務で即使える内容でした"
}
```

| フィールド | 型 | 必須 | 備考 |
|---|---|---|---|
| `reviewer` | string | | |
| `rating` | integer | | 1〜5 |
| `comment` | string | | |

**レスポンス 201**
```json
{
 "review_id": "x9y8z7w6-v5u4-3210-fedc-ba9876543210",
 "book_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 "reviewer": "Yohei",
 "rating": 5,
 "comment": "実務で即使える内容でした",
 "created_at": "2024-01-20T14:00:00Z"
}
```

**レスポンス 400**（必須フィールド欠損 / rating が範囲外）
```json
{ "error": "reviewer, rating, comment は必須です" }
```

**レスポンス 404**（書籍が存在しない場合）
```json
{ "error": "Book not found" }
```

---

## エラーハンドリング方針

| レイヤー | 手法 | 対象 |
|---|---|---|
| バリデーション | `abort(400)` | 必須フィールド欠損 |
| リソース確認 | `abort(404)` | 書籍・レビューが存在しない |
| DynamoDB 例外 | `try-except` + `abort(500)` | `BotoCoreError` / `ClientError` |
| 未捕捉例外 | `@app.errorhandler(500)` | その他の予期しないエラー |

エラーレスポンスは全て `{"error": "<message>"}` の形式に統一する。

---

## バックエンド設計

### アプリケーション構成

```
app.py
 └── Flask インスタンスを生成する
 └── flask-cors で CORS を設定する
 └── books_bp・reviews_bp を登録する（url_prefix='/api/v1'）
 └── 404・500 エラーハンドラーを定義する

db/dynamo.py
 └── 環境変数 TABLE_NAME を読み込む
 └── boto3 で DynamoDB リソースを初期化する
 └── get_table() でテーブルオブジェクトを返す

routes/books.py
 └── Blueprint 'books' を定義する
 └── 各エンドポイントの関数を実装する

routes/reviews.py
 └── Blueprint 'reviews' を定義する
 └── 各エンドポイントの関数を実装する
```

### 各エンドポイントのロジックフロー

**`GET /books`**
1. `scan()` で全アイテムを取得
2. `SK == 'METADATA'` のアイテムだけを抽出
3. 書籍リストを返す

**`POST /books`**
1. リクエストボディを取得・バリデーション
2. `uuid4()` で `book_id` を生成
3. `put_item()` で書籍レコードを書き込む
4. 登録した書籍オブジェクトを 201 で返す

**`GET /books/<book_id>`**
1. `get_item(PK=BOOK#<book_id>, SK=METADATA)` で取得
2. 存在しなければ 404
3. 書籍オブジェクトを返す

**`PUT /books/<book_id>`**
1. `get_item()` で存在確認、なければ 404
2. リクエストボディから変更フィールドを取得
3. `update_item()` で該当フィールドを更新
4. 更新後の書籍オブジェクトを返す

**`DELETE /books/<book_id>`**
1. `get_item()` で存在確認、なければ 404
2. `delete_item(PK=BOOK#<book_id>, SK=METADATA)` で削除
3. 完了メッセージを返す

**`GET /books/<book_id>/reviews`**
1. `get_item()` で書籍の存在確認、なければ 404
2. `query(PK=BOOK#<book_id>, SK begins_with 'REVIEW#')` でレビュー一覧を取得
3. レビューリストを返す

**`POST /books/<book_id>/reviews`**
1. `get_item()` で書籍の存在確認、なければ 404
2. リクエストボディを取得・バリデーション
3. `uuid4()` で `review_id` を生成
4. `put_item()` でレビューレコードを書き込む
5. 登録したレビューオブジェクトを 201 で返す

### 環境変数

| 変数名 | 説明 | 設定箇所 |
|---|---|---|
| `TABLE_NAME` | DynamoDB テーブル名（`book-review-api-workshop`） | Fargate タスク定義 |
| `FLASK_ENV` | `production` 固定 | Dockerfile |

### CORS 設定

Amplify（フロントエンド）からのリクエストを受け付けるため `flask-cors` を使用する。

```python
from flask_cors import CORS
CORS(app)
```

開発時は全オリジンを許可し、本番では Amplify のドメインに絞ることが望ましいが、ハンズオンでは全許可で統一する。
