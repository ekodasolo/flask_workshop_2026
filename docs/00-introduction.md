# Flask + DynamoDB REST API ハンズオン 手順書

## はじめに

このハンズオンでは、Python の Web フレームワーク **Flask** と AWS の NoSQL データベース **DynamoDB** を使って、書籍レビュー REST API を実装します。

<img width="1476" height="653" alt="image" src="https://github.com/user-attachments/assets/2deb13bf-6a88-4531-bccc-3a75f9d7c09d" />

### 学べること

- Flask の基本（ルーティング、Blueprint、エラーハンドリング）
- boto3 による DynamoDB の CRUD 操作（`put_item` / `get_item` / `scan` / `delete_item` / `update_item` / `query`）
- Docker によるコンテナ化と ECR への push

### 所要時間

約 3.5 時間（バッファ含む）

---

## Flask で REST API を作るということ

### REST API の仕組み

REST API は「**URL** + **HTTP メソッド**」の組み合わせで操作を表現します。

```
GET    /api/v1/books          → 書籍一覧を取得する
POST   /api/v1/books          → 書籍を登録する
GET    /api/v1/books/aaa-111   → 特定の書籍を取得する
PUT    /api/v1/books/aaa-111   → 特定の書籍を更新する
DELETE /api/v1/books/aaa-111   → 特定の書籍を削除する
```

同じ `/api/v1/books` という URL でも、HTTP メソッド（GET / POST / PUT / DELETE）が違えば異なる操作になります。

### Flask の役割 — URL とメソッドを Python 関数にマッピングする

Flask は「この URL にこの HTTP メソッドでリクエストが来たら、この Python 関数を呼ぶ」という対応付け（**ルーティング**）を行うフレームワークです。

```python
@books_bp.route('/books', methods=['GET'])
def list_books():
    # GET /books が来たらこの関数が呼ばれる
    ...

@books_bp.route('/books', methods=['POST'])
def create_book():
    # POST /books が来たらこの関数が呼ばれる
    ...
```

`@books_bp.route(...)` は **デコレータ** と呼ばれる Python の構文で、直下の関数に「この URL パターン + HTTP メソッドの担当ですよ」というメタ情報を付けます。

### リクエストとレスポンスの流れ

```
クライアント（curl / React）                Flask アプリ
        │                                    │
        │  POST /api/v1/books               │
        │  {"title": "Clean Code", ...}      │
        │ ─────────────────────────────────→ │
        │                                    │  create_book() 関数が呼ばれる
        │                                    │  ↓ request.get_json() でボディを取得
        │                                    │  ↓ DynamoDB に書き込み
        │                                    │  ↓ jsonify(book) でレスポンスを作成
        │  201 Created                       │
        │  {"book_id": "aaa-111", ...}       │
        │ ←───────────────────────────────── │
```

Flask では以下のオブジェクトを使ってリクエストとレスポンスを扱います:

| オブジェクト | 役割 | 使い方 |
|---|---|---|
| `request` | クライアントから送られたデータを読む | `request.get_json()` でボディを辞書として取得 |
| `jsonify()` | Python の辞書を JSON レスポンスに変換する | `return jsonify({'books': [...]})` |
| ステータスコード | レスポンスの結果を数値で伝える | `return jsonify(book), 201` |

### Blueprint — ルーティングをファイルに分割する

全てのルートを `app.py` 1 ファイルに書くと管理が大変です。Flask の **Blueprint** を使うと、リソース（書籍・レビュー）ごとにルーティングを別ファイルに分割できます。

```
app.py          ← Flask 本体。Blueprint を束ねる
routes/
  books.py      ← 書籍関連のルート（books_bp）
  reviews.py    ← レビュー関連のルート（reviews_bp）
```

`app.py` で Blueprint を登録する際に `url_prefix='/api/v1'` を付けると、各 Blueprint 内の `/books` が自動的に `/api/v1/books` になります。

---

## DynamoDB を理解する

### DynamoDB とは

Amazon DynamoDB は AWS が提供する **NoSQL データベース**です。MySQL や PostgreSQL のようなリレーショナルデータベース（RDB）とは設計思想が異なります。

```
RDB（MySQL など）:
  テーブル → 行と列で構成（Excel のようなイメージ）
  テーブル間を JOIN して関連データを取得する
  スキーマ（列定義）が固定

DynamoDB（NoSQL）:
  テーブル → アイテム（項目）の集合
  JOIN はない。1 つのテーブルに関連データをまとめて格納する
  キー以外の属性は自由（アイテムごとに異なる属性を持てる）
```

### キー設計 — PK と SK

DynamoDB のテーブルは **PK（Partition Key）** と **SK（Sort Key）** の 2 つのキーでアイテムを識別します。

| 概念 | RDB での対応 | 説明 |
|---|---|---|
| PK（Partition Key） | 主キーの一部 | データの格納先を決める。同じ PK のアイテムは近くに保存される |
| SK（Sort Key） | 主キーの一部 | PK 内でアイテムを区別・並び替える |
| PK + SK の組み合わせ | 複合主キー | テーブル内でアイテムを一意に特定する |

今回のハンズオンでは、書籍とレビューを **1 つのテーブル** に格納します（シングルテーブル設計）:

```
PK                  SK                  title           author          rating  comment
─────────────────────────────────────────────────────────────────────────────────────────
BOOK#aaa-111        METADATA            Clean Code      Robert Martin   -       -
BOOK#aaa-111        REVIEW#xxx-001      -               -               5       素晴らしい
BOOK#aaa-111        REVIEW#xxx-002      -               -               4       良い本
BOOK#bbb-222        METADATA            リーダブルコード  Dustin Boswell  -       -
```

- **書籍レコード**: PK が `BOOK#<book_id>`、SK が `METADATA`
- **レビューレコード**: PK が `BOOK#<book_id>`、SK が `REVIEW#<review_id>`

同じ `PK = BOOK#aaa-111` のアイテムには、その書籍の情報（METADATA）とレビューがまとまっています。これにより、ある書籍のレビュー一覧を **1 回のクエリ** で効率的に取得できます。

### Python から DynamoDB を操作する — boto3

AWS のサービスを Python から操作するには **boto3** というライブラリを使います。DynamoDB のアイテム操作でよく使うメソッドを見ていきましょう。

#### テーブルへの接続

```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('テーブル名')
```

`boto3.resource('dynamodb')` で DynamoDB に接続し、`.Table('テーブル名')` で操作対象のテーブルを取得します。

#### アイテムの書き込み — `put_item`

```python
table.put_item(Item={
    'PK': 'BOOK#aaa-111',
    'SK': 'METADATA',
    'title': 'Clean Code',
    'author': 'Robert Martin',
    'description': '読みやすいコードの書き方を解説した名著',
    'created_at': '2024-01-15T10:00:00Z',
})
```

Python の辞書をそのまま渡すだけです。RDB のように `INSERT INTO ... VALUES (...)` のような SQL を書く必要はありません。

#### アイテムの取得 — `get_item`

```python
response = table.get_item(Key={
    'PK': 'BOOK#aaa-111',
    'SK': 'METADATA',
})
item = response.get('Item')  # アイテムが見つからなければ None
```

PK と SK を指定して **1 件** を取得します。結果は `response['Item']` に辞書として入っています。

#### 全件取得 — `scan`

```python
response = table.scan()
items = response.get('Items', [])
```

テーブルの全アイテムを取得します。書籍もレビューも全て返ってくるので、アプリケーション側で `SK == 'METADATA'` のようにフィルタリングします。

#### 条件付き取得 — `query`

```python
from boto3.dynamodb.conditions import Key

response = table.query(
    KeyConditionExpression=Key('PK').eq('BOOK#aaa-111') & Key('SK').begins_with('REVIEW#')
)
reviews = response.get('Items', [])
```

`query` は PK を指定して、その PK に属するアイテムを取得します。SK の条件も付けられるので、「ある書籍のレビューだけ」を効率的に取得できます。`scan` との違いは、`query` が **必要なアイテムだけ** を取得する点です。

#### アイテムの削除 — `delete_item`

```python
table.delete_item(Key={
    'PK': 'BOOK#aaa-111',
    'SK': 'METADATA',
})
```

PK と SK を指定して削除します。

#### アイテムの更新 — `update_item`

```python
response = table.update_item(
    Key={
        'PK': 'BOOK#aaa-111',
        'SK': 'METADATA',
    },
    UpdateExpression='SET #title = :title, #author = :author',
    ExpressionAttributeNames={
        '#title': 'title',
        '#author': 'author',
    },
    ExpressionAttributeValues={
        ':title': '新しいタイトル',
        ':author': '新しい著者',
    },
    ReturnValues='ALL_NEW',
)
updated_item = response['Attributes']
```

`update_item` は他のメソッドに比べて複雑です。各パラメータの役割を整理しましょう:

| パラメータ | 役割 | 例 |
|---|---|---|
| `Key` | 更新対象のアイテムを指定 | `{'PK': '...', 'SK': '...'}` |
| `UpdateExpression` | 何をどう更新するかの式 | `'SET #title = :title'` |
| `ExpressionAttributeNames` | `#` 付きプレースホルダーと実際の属性名の対応 | `{'#title': 'title'}` |
| `ExpressionAttributeValues` | `:` 付きプレースホルダーと実際の値の対応 | `{':title': '新しいタイトル'}` |
| `ReturnValues` | 更新後のアイテムを返すかどうか | `'ALL_NEW'` で更新後の全属性を返す |

> **⚠️ 注意: パラメータ名は PascalCase（先頭大文字）**
>
> boto3 の DynamoDB API では、パラメータ名は `ExpressionAttributeValues` のように **各単語の先頭が大文字** です。`expressionAttributeValues`（小文字始まり）と書くとエラーになります。Python の変数名の慣習（snake_case）とは異なるので注意してください。

---

[次へ: 0. 環境確認 →](01-setup.md)
