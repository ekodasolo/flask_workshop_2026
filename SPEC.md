# 社内書籍レビューAPI ハンズオン SPEC

## 概要

| 項目 | 内容 |
|---|---|
| テーマ | Flask + DynamoDB で REST API を実装する |
| 対象 | Pythonある程度書ける・Web基礎知識あり |
| 時間 | 半日（3.5時間） |
| 題材 | 社内書籍レビューサービス |

---

## システム構成

```
[学習者 / ブラウザ]
 │
 │ HTTP (curl / Postman) HTTP (React UI)
 │ │
 ▼ ▼
[ALB] ←─────────────────────────────────────────── 講師側で構築済み
 │
 ▼
[Fargate] ─── Flask アプリ
 │
 ▼
[DynamoDB] book-review-api-workshop （全員で1テーブル共有）

[React アプリ] ─── AWS Amplify にホスティング済み（講師が事前デプロイ）
```

- 開発は EC2 上の Code Server で行う（学習者ごとにディレクトリ分離）
- インフラは1つの CDK スタックでデプロイする（VPC / ALB / Fargate / DynamoDB / ECR を含む）
- EC2 インスタンスロールで DynamoDB にアクセス（アクセスキー不要）
- テーブル名は環境変数 `TABLE_NAME` で注入
- 全員が ECR にイメージを push した後、講師が代表者を1人選んでタスク定義を更新・デプロイ
- React アプリは講師が Amplify にデプロイ済み、全員が同じ URL にアクセスして動作確認

---

## ディレクトリ構成

```
app/
├── app.py # Flaskアプリ初期化・Blueprint登録・エラーハンドラー
├── routes/
│ ├── books.py # /books エンドポイント
│ └── reviews.py # /books/<book_id>/reviews エンドポイント
├── db/
│ └── dynamo.py # boto3初期化・テーブル取得
├── requirements.txt
└── Dockerfile # 完成形を配布
```

---

## タイムライン

| # | パート | 時間 | 内容 |
|---|--------|------|------|
| 0 | イントロ | 20分 | システム概要・DynamoDBのデータモデル説明・環境確認 |
| 1 | Hello Flask | 20分 | `app.py` を書いてcurlで疎通確認、BlueprintとRoutingを理解する |
| 2 | Books CRUD | 60分 | `/books` の5エンドポイントを実装、boto3の基本操作を習得 |
| 3 | Reviews CRUD | 40分 | `/books/<book_id>/reviews` を実装、queryとbegins_withを理解する |
| 4 | エラーハンドリング | 20分 | `abort()` / `errorhandler` / try-except を追加する |
| 5 | デプロイ | 25分 | Dockerビルド → ECR push（全員） |
| 6 | 本番動作確認 | 20分 | 講師が代表者のイメージをFargateにデプロイ → React UIで全員が動作確認 |
| - | バッファ | 20分 | 詰まった人のフォロー |

---

## DynamoDB テーブル設計

### キー・バリューストアとは — Python の辞書から考える

Python の辞書（`dict`）では、キーを指定して値を出し入れする:

```python
# キーで値をセットする
books = {}
books['book-001'] = {'title': 'Clean Code', 'author': 'Robert C. Martin'}

# キーで値を取得する
print(books['book-001'])  # => {'title': 'Clean Code', ...}

# キーで値を削除する
del books['book-001']
```

DynamoDB はこの「キーで値を出し入れする」仕組みをクラウド上で提供するデータベース。辞書と同じ感覚で操作できるが、以下の違いがある:

| | Python の辞書 | DynamoDB |
|---|---|---|
| キー | 1 つ（任意の型） | 2 つ（PK + SK、どちらも文字列） |
| 保存先 | メモリ上 | AWS 上（永続化される） |
| 検索 | キーの完全一致のみ | PK の完全一致 + SK の前方一致検索ができる |
| 操作 | `dict[key]` / `del dict[key]` | `put_item` / `get_item` / `delete_item` / `query` |

DynamoDB ではキーが **PK（パーティションキー）** と **SK（ソートキー）** の 2 つで構成される。Python の辞書に例えると、こんなイメージ:

```python
# Python の辞書で DynamoDB を再現すると...
table = {}
table[('BOOK#aaa-111', 'METADATA')] = {'title': 'Clean Code', ...}        # 書籍
table[('BOOK#aaa-111', 'REVIEW#ccc-333')] = {'reviewer': 'Yohei', ...}    # レビュー

# PK + SK の組み合わせで 1 件取得（= get_item）
table[('BOOK#aaa-111', 'METADATA')]

# PK が同じアイテムをまとめて取得（= query）
# → ('BOOK#aaa-111', 'METADATA') と ('BOOK#aaa-111', 'REVIEW#ccc-333') の両方が取れる
```

SK にプレフィックス（`METADATA`、`REVIEW#`）を付けることで、同じ PK の下に異なる種類のデータをぶら下げて、種類ごとに絞り込める。これがシングルテーブル設計の基本的な考え方。

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

## 実装する API エンドポイント

### Books

| メソッド | パス | 処理 |
|---|---|---|
| GET | `/api/v1/books` | 書籍一覧取得（scan） |
| POST | `/api/v1/books` | 書籍登録（put_item） |
| GET | `/api/v1/books/<book_id>` | 書籍詳細取得（get_item） |
| PUT | `/api/v1/books/<book_id>` | 書籍更新（update_item） |
| DELETE | `/api/v1/books/<book_id>` | 書籍削除（delete_item） |

### Reviews

| メソッド | パス | 処理 |
|---|---|---|
| GET | `/api/v1/books/<book_id>/reviews` | レビュー一覧取得（query + begins_with） |
| POST | `/api/v1/books/<book_id>/reviews` | レビュー投稿（put_item） |

---

## 配布物一覧

| ファイル | 状態 | 備考 |
|---|---|---|
| `api-spec.md` | 完成形配布 | API仕様書 |
| `app.py` | 骨格配布 | Blueprint登録・エラーハンドラーはコメントのみ |
| `db/dynamo.py` | 完成形配布 | boto3初期化済み、学習者は触らない |
| `routes/books.py` | 骨格配布 | 関数定義とコメントのみ、学習者が実装 |
| `routes/reviews.py` | 骨格配布 | 関数定義とコメントのみ、学習者が実装 |
| `requirements.txt` | 完成形配布 | flask / boto3 |
| `Dockerfile` | 完成形配布 | 学習者は触らない |
| React アプリ | Amplify にデプロイ済み | 学習者は URL にアクセスするだけ |

---

## 講師側の事前準備

- [ ] EC2 インスタンス起動・Code Server セットアップ
- [ ] 学習者ごとのディレクトリ作成・スターターコード配置
- [ ] CDK スタックをデプロイ（VPC / ALB / Fargate / DynamoDB / ECR を含む1スタック）
- [ ] EC2 インスタンスロールに DynamoDB アクセス権限を付与
- [ ] ECR リポジトリの push 手順を手順書に記載
- [ ] 環境変数 `TABLE_NAME` をタスク定義に設定する手順を確認
- [ ] React アプリを Amplify にデプロイ（API エンドポイントを環境変数で設定）
- [ ] CORS 設定を Flask アプリに追加（Amplify ドメインからのリクエストを許可）

---

## 学習ポイントの設計意図

**パート2（Books）で習得すること**
- `boto3` の基本4操作（put / get / scan / delete）
- `uuid` による ID 生成
- Blueprint によるルート分割

**パート3（Reviews）で追加習得すること**
- `query` + `KeyConditionExpression` + `begins_with` によるSK絞り込み
- 親リソース（book）の存在確認を先に行う設計パターン

**パート4（エラーハンドリング）で追加習得すること**
- `abort()` で処理を中断してエラーハンドラーに飛ばす
- `@app.errorhandler` で一元管理する
- boto3 例外（`BotoCoreError` / `ClientError`）を try-except で拾う

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

### リクエスト / レスポンス仕様

---

#### `GET /api/v1/books`

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

#### `POST /api/v1/books`

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
| `title` | string | |
| `author` | string | |
| `description` | string | |

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

#### `GET /api/v1/books/<book_id>`

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

#### `PUT /api/v1/books/<book_id>`

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

#### `DELETE /api/v1/books/<book_id>`

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

#### `GET /api/v1/books/<book_id>/reviews`

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

#### `POST /api/v1/books/<book_id>/reviews`

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

### エラーハンドリング方針

| レイヤー | 手法 | 対象 |
|---|---|---|
| バリデーション | `abort(400)` | 必須フィールド欠損 |
| リソース確認 | `abort(404)` | 書籍・レビューが存在しない |
| DynamoDB 例外 | `try-except` + `abort(500)` | `BotoCoreError` / `ClientError` |
| 未捕捉例外 | `@app.errorhandler(500)` | その他の予期しないエラー |

エラーレスポンスは全て `{"error": "<message>"}` の形式に統一する。

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

### 依存パッケージ

| パッケージ | バージョン | 用途 |
|---|---|---|
| `flask` | 3.1.3 | Web フレームワーク |
| `flask-cors` | 6.0.2 | CORS 設定 |
| `boto3` | 1.42.x（最新） | DynamoDB アクセス |

### ツールバージョン一覧

| ツール / サービス | バージョン | 備考 |
|---|---|---|
| Python | 3.13 | Dockerfile ベースイメージも 3.13 系 |
| Flask | 3.1.3 | 2026/02 時点の最新安定版 |
| flask-cors | 6.0.2 | 2025/12 時点の最新安定版 |
| boto3 | 1.42.x | 週次リリースのため最新を使用 |
| Docker base image | `python:3.13-slim` | Fargate デプロイ用 |
| AWS CLI | v2 | ECR push に使用 |
| Node.js | 22.x LTS | React アプリのビルド環境 |
| React | 19.x | Amplify にデプロイするフロントエンド |

---

## フロントエンド（React アプリ）

### 概要

| 項目 | 内容 |
|---|---|
| フレームワーク | React |
| ホスティング | AWS Amplify |
| 学習者の役割 | URL にアクセスして操作するだけ |
| 作成者 | 講師 |

### 画面構成

**書籍一覧画面 (`/`)**
- 登録済み書籍の一覧表示
- 書籍登録フォーム（タイトル・著者・紹介文）
- 各書籍から詳細画面へのリンク

**書籍詳細画面 (`/books/:id`)**
- 書籍情報の表示・編集・削除
- レビュー一覧表示
- レビュー投稿フォーム（レビュアー名・評価・コメント）

### カバーする API エンドポイント

| 画面 | 操作 | エンドポイント |
|---|---|---|
| 一覧 | 書籍一覧表示 | `GET /api/v1/books` |
| 一覧 | 書籍登録 | `POST /api/v1/books` |
| 詳細 | 書籍詳細表示 | `GET /api/v1/books/:id` |
| 詳細 | 書籍更新 | `PUT /api/v1/books/:id` |
| 詳細 | 書籍削除 | `DELETE /api/v1/books/:id` |
| 詳細 | レビュー一覧表示 | `GET /api/v1/books/:id/reviews` |
| 詳細 | レビュー投稿 | `POST /api/v1/books/:id/reviews` |

### 注意事項

- Flask 側に CORS 設定が必要（`flask-cors` を使用）
- API エンドポイントの URL は Amplify の環境変数（`REACT_APP_API_BASE_URL`）で管理
- 学習者ごとに接続先 ALB が異なる場合は、画面上で URL を入力できるようにする

---

### コンポーネント設計

```
App
├── BooksPage # 書籍一覧画面 (/)
│ ├── BookForm # 書籍登録フォーム
│ └── BookList # 書籍一覧
│ └── BookCard # 書籍カード（1冊分）
│
└── BookDetailPage # 書籍詳細画面 (/books/:id)
 ├── BookDetail # 書籍情報表示・編集・削除
 ├── ReviewList # レビュー一覧
 │ └── ReviewCard # レビューカード（1件分）
 └── ReviewForm # レビュー投稿フォーム
```

---

### 各コンポーネントのプロパティ定義

#### `BookCard`

| props | 型 | 説明 |
|---|---|---|
| `book` | `Book` | 表示する書籍オブジェクト |
| `onClick` | `(bookId: string) => void` | カードクリック時のハンドラ（詳細画面へ遷移） |

#### `BookForm`

| props | 型 | 説明 |
|---|---|---|
| `onSubmit` | `(book: BookInput) => void` | フォーム送信時のハンドラ |

#### `BookList`

| props | 型 | 説明 |
|---|---|---|
| `books` | `Book[]` | 表示する書籍の配列 |
| `onSelect` | `(bookId: string) => void` | 書籍選択時のハンドラ |

#### `BookDetail`

| props | 型 | 説明 |
|---|---|---|
| `book` | `Book` | 表示・編集対象の書籍オブジェクト |
| `onUpdate` | `(book: BookInput) => void` | 更新時のハンドラ |
| `onDelete` | `(bookId: string) => void` | 削除時のハンドラ |

#### `ReviewCard`

| props | 型 | 説明 |
|---|---|---|
| `review` | `Review` | 表示するレビューオブジェクト |

#### `ReviewList`

| props | 型 | 説明 |
|---|---|---|
| `reviews` | `Review[]` | 表示するレビューの配列 |

#### `ReviewForm`

| props | 型 | 説明 |
|---|---|---|
| `bookId` | `string` | レビュー投稿対象の書籍 ID |
| `onSubmit` | `(review: ReviewInput) => void` | フォーム送信時のハンドラ |

---

### 型定義

```typescript
// 書籍（APIレスポンス）
type Book = {
 book_id: string;
 title: string;
 author: string;
 description: string;
 created_at: string;
};

// 書籍登録・更新時の入力
type BookInput = {
 title: string;
 author: string;
 description: string;
};

// レビュー（APIレスポンス）
type Review = {
 review_id: string;
 book_id: string;
 reviewer: string;
 rating: number; // 1〜5
 comment: string;
 created_at: string;
};

// レビュー投稿時の入力
type ReviewInput = {
 reviewer: string;
 rating: number;
 comment: string;
};
```

---

### 状態管理

各ページコンポーネントで `useState` / `useEffect` を使用する。外部状態管理ライブラリ（Redux等）は使用しない。

**`BooksPage` の状態**

| state | 型 | 説明 |
|---|---|---|
| `books` | `Book[]` | 書籍一覧 |
| `loading` | `boolean` | API通信中フラグ |
| `error` | `string \| null` | エラーメッセージ |

**`BookDetailPage` の状態**

| state | 型 | 説明 |
|---|---|---|
| `book` | `Book \| null` | 表示中の書籍 |
| `reviews` | `Review[]` | レビュー一覧 |
| `loading` | `boolean` | API通信中フラグ |
| `error` | `string \| null` | エラーメッセージ |

---

### API 呼び出し

`api.ts` に fetch ラッパーをまとめる。

```typescript
const BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const api = {
 // Books
 getBooks: () => fetch(`${BASE_URL}/api/v1/books`),
 createBook: (body: BookInput) =>
 fetch(`${BASE_URL}/api/v1/books`, { method: 'POST', ... }),
 getBook: (bookId: string) =>
 fetch(`${BASE_URL}/api/v1/books/${bookId}`),
 updateBook: (bookId: string, body: Partial<BookInput>) =>
 fetch(`${BASE_URL}/api/v1/books/${bookId}`, { method: 'PUT', ... }),
 deleteBook: (bookId: string) =>
 fetch(`${BASE_URL}/api/v1/books/${bookId}`, { method: 'DELETE' }),

 // Reviews
 getReviews: (bookId: string) =>
 fetch(`${BASE_URL}/api/v1/books/${bookId}/reviews`),
 createReview: (bookId: string, body: ReviewInput) =>
 fetch(`${BASE_URL}/api/v1/books/${bookId}/reviews`, { method: 'POST', ... }),
};
```
