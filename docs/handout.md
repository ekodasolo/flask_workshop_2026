# Flask + DynamoDB REST API ハンズオン 手順書

## はじめに

このハンズオンでは、Python の Web フレームワーク **Flask** と AWS の NoSQL データベース **DynamoDB** を使って、書籍レビュー REST API を実装します。

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

## 0. 環境確認（10 分）

> **SPEC.md を確認**: 「概要」「システム構成」「ディレクトリ構成」セクションを読んで、今日作るものの全体像を把握してください。

### 0-1. Code Server にアクセスする

講師から共有された URL にブラウザでアクセスしてください。

### 0-2. 自分のディレクトリに移動する

```bash
cd ~/app
```

### 0-3. ファイル構成を確認する

```
app/
├── app.py              # Flask アプリ（一部 TODO あり）
├── routes/
│   ├── books.py        # Books エンドポイント（TODO を実装する）
│   └── reviews.py      # Reviews エンドポイント（TODO を実装する）
├── db/
│   └── dynamo.py       # DynamoDB 接続（実装済み・変更不要）
├── requirements.txt    # 依存パッケージ（変更不要）
├── .env.example        # 環境変数テンプレート
└── Dockerfile          # Docker 設定（変更不要）
```

### 0-4. Python 仮想環境を作成する

#### 仮想環境（venv）とは

Python の **仮想環境** は、プロジェクトごとに独立したパッケージ管理空間を作る仕組みです。

```
仮想環境なし（グローバル）:
  Python ─── pip install → 全プロジェクトで同じパッケージを共有
  問題: プロジェクト A が Flask 2.x、プロジェクト B が Flask 3.x を使いたい → 衝突

仮想環境あり:
  プロジェクト A ─── .venv/ ─── Flask 2.x（A 専用）
  プロジェクト B ─── .venv/ ─── Flask 3.x（B 専用）
  → 互いに影響しない
```

今回は同じサーバーを複数人で共有するため、仮想環境を使って自分専用の Python 環境を作ります。Python 3 に標準搭載されている `venv` モジュールを使います。

#### 仮想環境を作成して有効化する

```bash
# 仮想環境を作成する（.venv ディレクトリが作られる）
python -m venv .venv

# 仮想環境を有効化する
source .venv/bin/activate
```

有効化されると、ターミナルのプロンプトの先頭に `(.venv)` と表示されます。

```
(.venv) user@host:~/app$
```

> **重要**: ターミナルを開き直したら、毎回 `source .venv/bin/activate` を実行してください。有効化を忘れるとグローバル環境にパッケージがインストールされてしまいます。
>
> 仮想環境を抜けたいときは `deactivate` コマンドを実行します（今回のハンズオンでは基本的に抜ける必要はありません）。

### 0-5. 環境変数を設定する

`.env.example` をコピーして `.env` ファイルを作成します。

```bash
cp .env.example .env
```

`.env` をエディタで開き、`TABLE_NAME` を講師から指示されたテーブル名に書き換えます。

```
TABLE_NAME=book-review-api-<あなたのユーザー名>
```

> **`.env` ファイルとは**: アプリケーションの設定値を管理するファイルです。`python-dotenv` ライブラリが `.env` を読み込み、環境変数として使えるようにします。`app.py` の `load_dotenv()` がこの読み込みを行っています。
>
> `.env` には接続先やパスワードなどの秘密情報が入ることがあるため、`.gitignore` に含めて Git にコミットしないのが鉄則です。代わりに `.env.example` をテンプレートとして配布します。

### 0-6. 依存パッケージをインストールする

```bash
pip install -r requirements.txt
```

> 仮想環境が有効な状態（プロンプトに `(.venv)` が表示されている状態）で実行してください。パッケージは `.venv/` の中にインストールされ、他の人の環境には影響しません。

---

## 1. Hello Flask（20 分）

> **SPEC.md を確認**: 「バックエンド設計 > アプリケーション構成」セクションで `app.py` の役割（Flask 初期化・CORS・Blueprint 登録・エラーハンドラー）を確認してください。

まずは Flask アプリを起動して動作確認します。

### 1-1. app.py の構成を理解する

`app.py` を開いてください。既に書かれているコードを確認しましょう。

```python
load_dotenv()            # .env ファイルから環境変数を読み込む
app = Flask(__name__)    # Flask アプリケーションのインスタンスを作成
CORS(app)                # 全オリジンからのアクセスを許可（React UI から呼べるようにする）
```

- **`load_dotenv()`** — `.env` ファイルに書かれた設定値を環境変数として読み込む。`db/dynamo.py` の `os.environ['TABLE_NAME']` はこの仕組みで値を取得している
- **`Flask(__name__)`** — Flask アプリの本体を作る。`__name__` はPython のモジュール名で、Flask がテンプレートや静的ファイルの場所を見つけるために使います
- **`CORS(app)`** — ブラウザのセキュリティ制約（同一オリジンポリシー）を解除し、React UI など別ドメインからの API 呼び出しを許可する設定

エラーハンドラー（`@app.errorhandler(404)` / `@app.errorhandler(500)`）は提供済みです。コードを読んで、どのような処理をしているか確認しておきましょう。これらの仕組みはチャプター 4 で詳しく学びます。

### 1-2. Blueprint を登録する

TODO が 1 つあります。`app.py` の TODO セクションに以下を追加してください:

```python
from routes.books import books_bp
from routes.reviews import reviews_bp

app.register_blueprint(books_bp, url_prefix='/api/v1')
app.register_blueprint(reviews_bp, url_prefix='/api/v1')
```

**Flask 解説 — Blueprint の登録とは**:

`register_blueprint()` は「この Blueprint に定義されたルートを、Flask アプリに組み込む」という操作です。

```
books.py で定義:    @books_bp.route('/books', ...)
                                      ↓
app.py で登録:      url_prefix='/api/v1' を付与
                                      ↓
実際の URL:         /api/v1/books
```

`url_prefix` を変えるだけで、同じ Blueprint を `/api/v1/books` にも `/api/v2/books` にもマウントできます。API のバージョン管理に便利です。

### 1-3. Flask を起動して動作確認する

```bash
python app.py
```

別のターミナルから curl で疎通確認します:

```bash
# 存在しないパスにアクセスして 404 が返ることを確認する
curl -s http://localhost:5000/api/v1/books | python -m json.tool
```

まだ `books.py` の中身を実装していないので、空のレスポンスまたはエラーが返りますが、Flask が起動していれば OK です。

確認が終わったら `Ctrl+C` で Flask を停止してください。

---

## 2. Books CRUD（60 分）

> **SPEC.md を確認**: 以下のセクションに目を通してから実装に入りましょう。
> - 「DynamoDB テーブル設計」 — PK/SK の構造とシングルテーブル設計、具体例によるデータの流れ
> - 「実装する API エンドポイント > Books」 — 5 つのエンドポイントの一覧
> - 「リクエスト / レスポンス仕様」の Books 部分 — 各エンドポイントの入出力フォーマット

このパートでは、`routes/books.py` を開いて 5 つのエンドポイントを実装します。
ファイルには各関数の雛形と TODO コメントが用意されているので、コメントの指示に従ってコードを書いていきましょう。

### Flask 解説 — ルートの書き方

このパートで初めて Flask のルート関数を書きます。ルート関数の基本構造を理解しましょう。

```python
@books_bp.route('/books', methods=['GET'])   # ← どの URL・メソッドに反応するか
def list_books():                             # ← 関数名は自由（分かりやすい名前を付ける）
    # ... 処理 ...
    return jsonify({'books': [...]})          # ← JSON レスポンスを返す
```

**`methods` パラメータ** で、同じ URL でも異なる操作を割り当てられます:

| デコレータ | 意味 |
|---|---|
| `@route('/books', methods=['GET'])` | 一覧を**取得**するリクエストを処理 |
| `@route('/books', methods=['POST'])` | 新規**登録**するリクエストを処理 |
| `@route('/books/<book_id>', methods=['PUT'])` | 既存データを**更新**するリクエストを処理 |
| `@route('/books/<book_id>', methods=['DELETE'])` | データを**削除**するリクエストを処理 |

**URL パラメータ `<book_id>`**: URL の一部を `< >` で囲むと、Flask がその部分を変数として関数に渡します。`/books/aaa-111` にアクセスすると `book_id = 'aaa-111'` になります。

**レスポンスの返し方**:
- `return jsonify(data)` — ステータスコード `200 OK` で返す（デフォルト）
- `return jsonify(data), 201` — ステータスコード `201 Created` で返す（新規作成時）
- `return jsonify({'error': '...'}), 400` — ステータスコード `400 Bad Request` で返す（バリデーションエラー時）

### このパートで使う boto3 の操作

| 操作 | Python メソッド | 用途 |
|---|---|---|
| 全件取得 | `table.scan()` | テーブルの全アイテムを取得する |
| 1 件取得 | `table.get_item(Key={...})` | PK + SK を指定して 1 件取得する |
| 書き込み | `table.put_item(Item={...})` | アイテムを新規作成する |
| 更新 | `table.update_item(Key={...}, ...)` | 既存アイテムの一部フィールドを更新する |
| 削除 | `table.delete_item(Key={...})` | アイテムを削除する |

### DynamoDB テーブルの構造（おさらい）

| PK | SK | 用途 |
|---|---|---|
| `BOOK#<book_id>` | `METADATA` | 書籍レコード |
| `BOOK#<book_id>` | `REVIEW#<review_id>` | レビューレコード |

書籍とレビューは同じテーブルに格納されます。SK の値（`METADATA` か `REVIEW#...`）で書籍レコードとレビューレコードを区別します。

---

### 2-1. GET /api/v1/books — 書籍一覧取得

`list_books()` 関数の TODO を実装します。

**この関数がやること**: テーブルから全アイテムを取得し、書籍レコード（SK が `METADATA`）だけを抽出して返す。

```python
@books_bp.route('/books', methods=['GET'])
def list_books():
    try:
        table = get_table()
        response = table.scan()
        items = response.get('Items', [])

        books = []
        for item in items:
            if item.get('SK') == 'METADATA':
                books.append({
                    'book_id': item['PK'].replace('BOOK#', ''),
                    'title': item['title'],
                    'author': item['author'],
                    'description': item['description'],
                    'created_at': item['created_at'],
                })

        return jsonify({'books': books})
    except (BotoCoreError, ClientError) as e:
        abort(500)
```

**コードの解説**:

1. **`table.scan()`** — テーブルの全アイテムを取得する。Python の辞書で例えると `list(table.values())` のようなイメージ
2. **`response.get('Items', [])`** — DynamoDB のレスポンスは辞書形式で、アイテムは `Items` キーに入っている。アイテムがなければ空リストを返す
3. **`if item.get('SK') == 'METADATA'`** — テーブルには書籍とレビューが混在しているので、SK が `METADATA` のもの（= 書籍）だけを抽出する
4. **`item['PK'].replace('BOOK#', '')`** — PK は `BOOK#aaa-111` のような形式。API のレスポンスには `BOOK#` プレフィックスは不要なので、`replace` で除去して `book_id` だけを返す
5. **`try-except`** — DynamoDB への通信でエラーが起きた場合に 500 を返す。`BotoCoreError` は AWS SDK の基底例外、`ClientError` は AWS サービスが返すエラー

---

### 2-2. POST /api/v1/books — 書籍登録

`create_book()` 関数の TODO を実装します。

**この関数がやること**: リクエストボディから書籍情報を受け取り、UUID で ID を生成して DynamoDB に保存する。

```python
@books_bp.route('/books', methods=['POST'])
def create_book():
    data = request.get_json()

    if not data or not all(key in data for key in ['title', 'author', 'description']):
        return jsonify({'error': 'title, author, description は必須です'}), 400

    try:
        table = get_table()
        book_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

        item = {
            'PK': f'BOOK#{book_id}',
            'SK': 'METADATA',
            'title': data['title'],
            'author': data['author'],
            'description': data['description'],
            'created_at': created_at,
        }
        table.put_item(Item=item)

        book = {
            'book_id': book_id,
            'title': data['title'],
            'author': data['author'],
            'description': data['description'],
            'created_at': created_at,
        }
        return jsonify(book), 201
    except (BotoCoreError, ClientError) as e:
        abort(500)
```

**コードの解説**:

1. **`request.get_json()`** — HTTP リクエストのボディを JSON としてパースし、Python の辞書として返す。`curl` で `-d '{"title": "..."}'` と送った内容がここに入る
2. **バリデーション** — `all(key in data for key in [...])` で必須フィールドが全て含まれているかチェック。足りなければ `400 Bad Request` を返す
3. **`uuid.uuid4()`** — ランダムな一意の ID を生成する。`str()` で文字列に変換して `book_id` として使う
4. **`datetime.now(timezone.utc)`** — UTC（世界標準時）で現在時刻を取得し、`strftime` で `2024-01-15T10:00:00Z` 形式の文字列に変換する
5. **`table.put_item(Item=item)`** — Python の辞書で例えると `table[('BOOK#xxx', 'METADATA')] = {...}` に相当する操作
6. **`return jsonify(book), 201`** — 成功時は `201 Created` ステータスコードを返す。`200 OK` ではなく `201` を使うのが REST API の慣例（新しいリソースが作成された場合）

---

### 動作確認: 書籍を登録して一覧を取得する

ここで一度動作確認をしましょう。Flask を起動して curl で確認します:

```bash
python app.py
```

別のターミナルで以下を実行してください:

```bash
# 書籍を登録する
curl -s -X POST http://localhost:5000/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Code", "author": "Robert C. Martin", "description": "読みやすいコードの書き方"}' \
  | python -m json.tool

# 書籍一覧を取得する
curl -s http://localhost:5000/api/v1/books | python -m json.tool
```

**curl コマンドの解説**:
- `-s` — サイレントモード。プログレスバーを非表示にする
- `-X POST` — HTTP メソッドを POST に指定する（デフォルトは GET）
- `-H "Content-Type: application/json"` — リクエストヘッダーで「JSON を送ります」と宣言する
- `-d '{...}'` — リクエストボディに JSON を設定する
- `| python -m json.tool` — レスポンスの JSON を整形表示する

登録した書籍が一覧に表示されれば成功です。

---

### 2-3. GET /api/v1/books/<book_id> — 書籍詳細取得

`get_book()` 関数の TODO を実装します。

**この関数がやること**: URL の `<book_id>` 部分を使って DynamoDB から 1 件の書籍を取得する。

> `try-except` の枠は提供済みです。TODO コメントの `pass` を以下のコードに置き換えてください。

```python
        response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        item = response.get('Item')

        if not item:
            return jsonify({'error': 'Book not found'}), 404

        book = {
            'book_id': book_id,
            'title': item['title'],
            'author': item['author'],
            'description': item['description'],
            'created_at': item['created_at'],
        }
        return jsonify(book)
```

**コードの解説**:

1. **`<book_id>`** — Flask のルーティングで URL の一部を変数として受け取る仕組み。`/books/aaa-111` にアクセスすると `book_id = 'aaa-111'` が関数に渡される
2. **`table.get_item(Key={...})`** — PK と SK の両方を指定して 1 件のアイテムを取得する。Python の辞書で例えると `table.get(('BOOK#aaa-111', 'METADATA'))` に相当する
3. **`response.get('Item')`** — アイテムが見つかれば辞書が返り、見つからなければ `None` が返る
4. **`if not item:`** — アイテムが存在しなければ `404 Not Found` を返す。存在しないリソースにアクセスされたことを示す

**`scan` と `get_item` の違い**:
- `scan`: テーブル全体を走査する（遅いが、条件に合う全件を取得できる）
- `get_item`: PK + SK を指定して 1 件だけ取得する（高速・効率的）

---

### 2-4. PUT /api/v1/books/<book_id> — 書籍更新

`update_book()` 関数の TODO を実装します。

**この関数がやること**: 既存の書籍の一部フィールド（title, author, description）を更新する。

> この関数は今回のハンズオンで **最も難しい** パートです。`update_item` の仕組みを理解しましょう。
>
> 存在確認・リクエスト取得・`allowed_fields` の定義は提供済みです。TODO コメントの `pass` を以下のコードに置き換えてください。

```python
        update_expressions = []
        expression_values = {}
        expression_names = {}

        for field in allowed_fields:
            if field in data:
                update_expressions.append(f'#{field} = :{field}')
                expression_values[f':{field}'] = data[field]
                expression_names[f'#{field}'] = field

        if not update_expressions:
            return jsonify({'error': 'No valid fields to update'}), 400

        result = table.update_item(
            Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'},
            UpdateExpression='SET ' + ', '.join(update_expressions),
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames=expression_names,
            ReturnValues='ALL_NEW',
        )

        updated = result['Attributes']
        book = {
            'book_id': book_id,
            'title': updated['title'],
            'author': updated['author'],
            'description': updated['description'],
            'created_at': updated['created_at'],
        }
        return jsonify(book)
```

**コードの解説**:

1. **存在確認を先に行う** — 更新対象の書籍が存在しなければ 404 を返す。DynamoDB の `update_item` は、対象がなければ新規作成してしまうため、事前に確認が必要
2. **`allowed_fields`** — 更新を許可するフィールドのリスト。リクエストに含まれないフィールドは更新しない

**`update_item` の 3 つのパラメータ**:

`update_item` は SQL の `UPDATE SET` に相当する操作ですが、DynamoDB 独自の式（Expression）で指定します。

例えば `description` だけを更新する場合、以下のようになります:

```
UpdateExpression:        "SET #description = :description"
ExpressionAttributeValues: {":description": "新しい紹介文"}
ExpressionAttributeNames:  {"#description": "description"}
```

- **`UpdateExpression`** — 「何を、どう更新するか」を記述する式。`SET #description = :description` は「`description` フィールドを新しい値に設定する」という意味
- **`ExpressionAttributeValues`** — 式の中の `:変数名` に対応する実際の値。`:description` → `"新しい紹介文"`
- **`ExpressionAttributeNames`** — 式の中の `#変数名` に対応する実際のフィールド名。`#description` → `"description"`

> **なぜ `#` や `:` を使うのか？**
> DynamoDB には `title`, `name`, `status` など多数の予約語があり、フィールド名をそのまま式に書くとエラーになる場合があります。`#field` でエイリアスを使い、`:field` で値をプレースホルダーにすることで、予約語との衝突を回避します。

3. **`ReturnValues='ALL_NEW'`** — 更新後のアイテム全体を返してもらう設定。これがないと更新は実行されるが、結果を別途 `get_item` で取得する必要がある

---

### 2-5. DELETE /api/v1/books/<book_id> — 書籍削除

`delete_book()` 関数の TODO を実装します。

**この関数がやること**: 指定された書籍を DynamoDB から削除する。

> 存在確認と `try-except` は提供済みです。TODO コメントの `pass` を以下のコードに置き換えてください。

```python
        table.delete_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})

        return jsonify({'message': 'Book deleted'})
```

**コードの解説**:

1. **存在確認は提供済み** — 存在しない書籍を削除しようとした場合に 404 を返します。DynamoDB の `delete_item` は存在しないキーに対してもエラーにならない（何も起きない）ので、明示的にチェックが必要です
2. **`table.delete_item(Key={...})`** — PK と SK を指定してアイテムを削除する。Python の辞書で例えると `del table[('BOOK#xxx', 'METADATA')]` に相当する

---

### 動作確認: 全 Books エンドポイント

5 つのエンドポイントが全て実装できたら、一連の流れを確認しましょう:

```bash
# 1. 書籍を登録する
curl -s -X POST http://localhost:5000/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Code", "author": "Robert C. Martin", "description": "読みやすいコードの書き方"}' \
  | python -m json.tool

# → レスポンスの book_id を控えておく（例: abc123...）

# 2. 書籍詳細を取得する
curl -s http://localhost:5000/api/v1/books/<book_id> | python -m json.tool

# 3. 書籍を更新する（description だけ変更）
curl -s -X PUT http://localhost:5000/api/v1/books/<book_id> \
  -H "Content-Type: application/json" \
  -d '{"description": "コードの品質を高めるベストプラクティス集"}' \
  | python -m json.tool

# 4. 書籍を削除する
curl -s -X DELETE http://localhost:5000/api/v1/books/<book_id> | python -m json.tool

# 5. 一覧から消えていることを確認する
curl -s http://localhost:5000/api/v1/books | python -m json.tool
```

全て正常に動作すれば、Books CRUD は完成です。

### ここまでのまとめ — 5 つの操作と DynamoDB メソッドの対応

| HTTP メソッド | エンドポイント | DynamoDB 操作 | 用途 |
|---|---|---|---|
| GET | `/books` | `scan()` | 全件取得 |
| POST | `/books` | `put_item()` | 新規作成 |
| GET | `/books/<id>` | `get_item()` | 1 件取得 |
| PUT | `/books/<id>` | `update_item()` | 部分更新 |
| DELETE | `/books/<id>` | `delete_item()` | 削除 |

---

## 3. Reviews CRUD（40 分）

> **SPEC.md を確認**: 以下のセクションに目を通してから実装に入りましょう。
> - 「実装する API エンドポイント > Reviews」 — 2 つのエンドポイントの一覧
> - 「リクエスト / レスポンス仕様」の Reviews 部分 — リクエスト・レスポンスのフォーマットと rating の範囲制約
> - 「学習ポイントの設計意図 > パート3」 — `query` + `begins_with` と親リソース存在確認の意図

このパートでは `routes/reviews.py` を開いて、2 つのエンドポイントを実装します。

### Flask 解説 — ネストしたルート

パート 2 では `/books` や `/books/<book_id>` というルートを定義しました。レビューは「書籍に属するリソース」なので、URL にも親子関係を反映させます。

```python
# パート 2 のルート（書籍）
@books_bp.route('/books/<book_id>', ...)

# パート 3 のルート（レビュー = 書籍の子リソース）
@reviews_bp.route('/books/<book_id>/reviews', ...)
```

`/books/<book_id>/reviews` という URL は「book_id で指定された書籍のレビュー一覧」を意味します。Flask は `<book_id>` の部分を自動的に関数の引数として渡します。

```python
def list_reviews(book_id):   # ← URL の <book_id> がここに入る
    # book_id を使って、この書籍に紐づくレビューを取得する
```

このように URL で親子関係を表現するのは、REST API の設計原則です。

### このパートの新しい概念

パート 2 では `scan` と `get_item` でデータを取得しましたが、このパートでは **`query`** という新しい操作を使います。

| 操作 | 特徴 | 使いどころ |
|---|---|---|
| `scan` | テーブル全体を走査する | 条件なしで全件取得したい場合 |
| `get_item` | PK + SK を完全一致で 1 件取得 | ID が分かっている 1 件を取得する場合 |
| `query` | PK を指定し、SK で絞り込む | 同じ PK に属するアイテムをまとめて取得する場合 |

レビューは書籍と同じ PK（`BOOK#<book_id>`）を持ち、SK が `REVIEW#...` で始まります。`query` を使えば、特定の書籍に紐づくレビューだけを効率的に取得できます。

### 親リソースの存在確認パターン

レビューは「書籍に対するレビュー」なので、**レビュー操作の前に必ず親リソース（書籍）の存在を確認**します。存在しない書籍に対してレビューを取得・投稿しようとした場合は `404` を返します。

```
リクエスト → 書籍の存在確認 → (存在しない → 404) → レビュー操作を実行
```

この「親リソースの存在を先にチェックする」パターンは、REST API の設計でよく使われます。

---

### 3-1. GET /api/v1/books/<book_id>/reviews — レビュー一覧取得

`list_reviews()` 関数の TODO を実装します。

**この関数がやること**: 指定された書籍の存在を確認し、その書籍に紐づくレビューを `query` で取得して返す。

> 書籍の存在確認と `try-except` は提供済みです。TODO コメントの `pass` を以下のコードに置き換えてください。

```python
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'BOOK#{book_id}') & Key('SK').begins_with('REVIEW#')
        )
        items = response.get('Items', [])

        reviews = []
        for item in items:
            reviews.append({
                'review_id': item['SK'].replace('REVIEW#', ''),
                'book_id': book_id,
                'reviewer': item['reviewer'],
                'rating': int(item['rating']),
                'comment': item['comment'],
                'created_at': item['created_at'],
            })

        return jsonify({'reviews': reviews})
```

**コードの解説**:

1. **書籍の存在確認（提供済み）** — `get_item` で書籍（SK=`METADATA`）が存在するか確認し、存在しなければ 404 を返します
2. **`table.query(KeyConditionExpression=...)`** — ここが新しい操作。`query` は以下の 2 つの条件を組み合わせて検索する:
   - `Key('PK').eq(f'BOOK#{book_id}')` — PK が指定した値と**一致する**アイテム
   - `Key('SK').begins_with('REVIEW#')` — SK が `REVIEW#` で**始まる**アイテム
   - `&` で 2 つの条件を AND 結合する
3. **`int(item['rating'])`** — DynamoDB は数値を `Decimal` 型で返すため、`int()` で Python の整数型に変換する
4. **`item['SK'].replace('REVIEW#', '')`** — SK から `REVIEW#` プレフィックスを除去して `review_id` を取り出す

**`query` を使うメリット**:

SPEC.md の具体例で考えてみましょう。テーブルに 4 件のアイテムがある場合:

| PK | SK |
|---|---|
| `BOOK#aaa-111` | `METADATA` |
| `BOOK#aaa-111` | `REVIEW#ccc-333` |
| `BOOK#aaa-111` | `REVIEW#ddd-444` |
| `BOOK#bbb-222` | `METADATA` |

`query(PK='BOOK#aaa-111', SK begins_with 'REVIEW#')` は **2 件だけ**を返します（`REVIEW#ccc-333` と `REVIEW#ddd-444`）。`scan` で全 4 件を取得してフィルタするより効率的です。

---

### 3-2. POST /api/v1/books/<book_id>/reviews — レビュー投稿

`create_review()` 関数の TODO を実装します。

**この関数がやること**: 書籍の存在を確認し、バリデーション後にレビューを DynamoDB に保存する。

> 書籍の存在確認、バリデーション、UUID/timestamp 生成は提供済みです。TODO コメントの `pass` を以下のコードに置き換えてください。

```python
        item = {
            'PK': f'BOOK#{book_id}',
            'SK': f'REVIEW#{review_id}',
            'reviewer': data['reviewer'],
            'rating': data['rating'],
            'comment': data['comment'],
            'created_at': created_at,
        }
        table.put_item(Item=item)

        review = {
            'review_id': review_id,
            'book_id': book_id,
            'reviewer': data['reviewer'],
            'rating': data['rating'],
            'comment': data['comment'],
            'created_at': created_at,
        }
        return jsonify(review), 201
```

**コードの解説**:

1. **書籍の存在確認（提供済み）** — レビュー投稿前に必ず親リソース（書籍）の存在を確認する
2. **バリデーション（提供済み）** — 必須フィールドと rating 範囲のチェック。`create_book` で学んだパターンと同じ
3. **PK と SK の設定** — PK は書籍と同じ `BOOK#<book_id>`。SK は `REVIEW#<review_id>` とすることで、同じ PK の下に書籍本体とレビューが共存する

**書籍登録（POST /books）との違い**:
- PK が新規 ID ではなく、**既存の書籍の PK を使う**
- SK が `METADATA` ではなく `REVIEW#<review_id>`
- バリデーションに `rating` の範囲チェックが追加

---

### 動作確認: Reviews エンドポイント

```bash
# 1. まず書籍を登録する（book_id を控える）
curl -s -X POST http://localhost:5000/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Code", "author": "Robert C. Martin", "description": "読みやすいコードの書き方"}' \
  | python -m json.tool

# 2. レビューを投稿する（<book_id> を手順 1 の結果に置き換える）
curl -s -X POST http://localhost:5000/api/v1/books/<book_id>/reviews \
  -H "Content-Type: application/json" \
  -d '{"reviewer": "Yohei", "rating": 5, "comment": "実務で即使える内容でした"}' \
  | python -m json.tool

# 3. もう 1 件レビューを投稿する
curl -s -X POST http://localhost:5000/api/v1/books/<book_id>/reviews \
  -H "Content-Type: application/json" \
  -d '{"reviewer": "Tanaka", "rating": 4, "comment": "初心者にもおすすめ"}' \
  | python -m json.tool

# 4. レビュー一覧を取得する（2 件返ることを確認）
curl -s http://localhost:5000/api/v1/books/<book_id>/reviews | python -m json.tool

# 5. 存在しない書籍のレビューを取得する（404 が返ることを確認）
curl -s http://localhost:5000/api/v1/books/nonexistent-id/reviews | python -m json.tool
```

全て正常に動作すれば、Reviews CRUD は完成です。

---

## 4. エラーハンドリング確認（20 分）

> **SPEC.md を確認**: 「エラーハンドリング方針」セクションで、4 つのレイヤー（バリデーション / リソース確認 / DynamoDB 例外 / 未捕捉例外）の全体像を確認してください。

ここまでの実装で、エラーハンドリングも既に含まれています。このパートでは、エラーハンドリングの仕組みを整理し、正しく動作するか確認します。

### Flask 解説 — エラーを返す 2 つの方法

Flask でエラーレスポンスを返す方法は大きく 2 つあります。

**方法 1: `return` でステータスコードを指定する**

```python
return jsonify({'error': 'Book not found'}), 404
```

`jsonify()` の第 2 戻り値としてステータスコードを返します。この方法は**エラーメッセージをカスタマイズしたい場合**に使います。パート 2〜3 のバリデーションや 404 チェックではこの方法を使いました。

**方法 2: `abort()` でエラーを発生させる**

```python
abort(500)
```

`abort()` は例外を発生させて処理を中断します。`@app.errorhandler` で定義したハンドラーがこの例外を受け取り、レスポンスを生成します。この方法は**共通のエラーレスポンスを返したい場合**に使います。パート 2〜3 の `try-except` 内で `abort(500)` を使いました。

```
abort(500) が呼ばれる
    ↓ Flask が例外をキャッチ
@app.errorhandler(500) が呼ばれる
    ↓
{"error": "Internal server error"} を返す
```

### エラーハンドリングの全体像

API では「正常な操作」だけでなく「異常な操作」にも適切に対応する必要があります。このアプリでは 4 つのレイヤーでエラーを処理しています:

```
リクエスト
  │
  ▼
[レイヤー 1] バリデーション ─── 入力が不正 → 400 Bad Request
  │
  ▼
[レイヤー 2] リソース確認 ─── リソースが存在しない → 404 Not Found
  │
  ▼
[レイヤー 3] DynamoDB 操作 ─── AWS との通信エラー → 500 Internal Server Error
  │                             （try-except で BotoCoreError / ClientError を捕捉）
  ▼
[レイヤー 4] 未捕捉例外 ─── その他の予期しないエラー → 500 Internal Server Error
                             （@app.errorhandler(500) で処理）
```

**エラーレスポンスの統一形式**: 全てのエラーは `{"error": "メッセージ"}` の形式で返します。クライアント側（React アプリや curl）は、レスポンスに `error` キーがあればエラーとして処理できます。

### 4-1. バリデーションエラー（400 Bad Request）

リクエストの内容が不正な場合に返すエラーです。「あなたが送ったデータに問題がありますよ」とクライアントに伝えます。

**パート 2 で実装済みのバリデーション**:
- `POST /books` — `title`, `author`, `description` が全て含まれているか

**パート 3 で実装済みのバリデーション**:
- `POST /reviews` — `reviewer`, `rating`, `comment` が全て含まれているか
- `POST /reviews` — `rating` が 1〜5 の整数か

実際に確認してみましょう:

```bash
# 必須フィールドが足りない場合（author と description がない）
curl -s -X POST http://localhost:5000/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Code"}' \
  | python -m json.tool
# → {"error": "title, author, description は必須です"} が返る

# rating が範囲外の場合
curl -s -X POST http://localhost:5000/api/v1/books/<book_id>/reviews \
  -H "Content-Type: application/json" \
  -d '{"reviewer": "Yohei", "rating": 10, "comment": "テスト"}' \
  | python -m json.tool
# → {"error": "rating is out of range (1-5)"} が返る

# リクエストボディが空の場合
curl -s -X POST http://localhost:5000/api/v1/books \
  -H "Content-Type: application/json" \
  | python -m json.tool
# → 400 エラーが返る
```

### 4-2. リソース不存在（404 Not Found）

指定されたリソースが DynamoDB に存在しない場合に返すエラーです。

```bash
# 存在しない書籍を取得する
curl -s http://localhost:5000/api/v1/books/nonexistent-id | python -m json.tool
# → {"error": "Book not found"} が返る

# 存在しない書籍を更新しようとする
curl -s -X PUT http://localhost:5000/api/v1/books/nonexistent-id \
  -H "Content-Type: application/json" \
  -d '{"title": "New Title"}' \
  | python -m json.tool
# → {"error": "Book not found"} が返る

# 存在しない書籍のレビューを取得する
curl -s http://localhost:5000/api/v1/books/nonexistent-id/reviews | python -m json.tool
# → {"error": "Book not found"} が返る
```

### 4-3. DynamoDB 例外（500 Internal Server Error）

DynamoDB への通信中にエラーが発生した場合（ネットワーク障害、権限不足など）、`try-except` で捕捉して 500 を返します。

```python
# 全てのエンドポイントで以下のパターンを使用している:
try:
    table = get_table()
    # ... DynamoDB 操作 ...
except (BotoCoreError, ClientError) as e:
    abort(500)
```

- **`BotoCoreError`** — AWS SDK の基底例外クラス。ネットワークエラーなど
- **`ClientError`** — AWS サービスが返すエラー。権限不足、テーブル不存在など

### 4-4. 未捕捉例外（@app.errorhandler）

`app.py` に定義済みの `@app.errorhandler(500)` が最後の砦です。`try-except` で捕捉できなかったエラーや、`abort(500)` で明示的に発生させた 500 エラーをここで処理します。

```python
@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({'error': 'Internal server error'}), 500
```

この仕組みにより、どんなエラーが起きても API は常に JSON 形式のレスポンスを返します。HTML のエラーページが返ってしまうことを防ぎます。

### エラーハンドリングのまとめ

| レイヤー | 手法 | 対象 | HTTP ステータス |
|---|---|---|---|
| バリデーション | `return jsonify({...}), 400` | 必須フィールド欠損、rating 範囲外 | 400 |
| リソース確認 | `return jsonify({...}), 404` | 書籍が存在しない | 404 |
| DynamoDB 例外 | `try-except` + `abort(500)` | `BotoCoreError` / `ClientError` | 500 |
| 未捕捉例外 | `@app.errorhandler(500)` | その他の予期しないエラー | 500 |

> **HTTP ステータスコードの意味**:
> - **400** — クライアント側のミス（リクエストが間違っている）
> - **404** — リソースが見つからない
> - **500** — サーバー側のエラー（API 側の問題）

---

## 5. デプロイ（25 分）

> **SPEC.md を確認**: 「ツールバージョン一覧」セクションで、Docker ベースイメージ（`python:3.13-slim`）と AWS CLI v2 を使うことを確認してください。

完成した API を Docker イメージにビルドし、AWS の ECR（Elastic Container Registry）に push します。push したイメージは、講師が AWS Fargate にデプロイして本番環境で動かします。

### デプロイの全体像

```
[あなたのコード]
     │
     ▼  docker build
[Docker イメージ]  ← ローカルに作成される
     │
     ▼  docker push
[ECR リポジトリ]   ← AWS 上のイメージ保管庫に push する
     │
     ▼  講師がデプロイ
[Fargate]          ← ECR のイメージを使ってコンテナを起動する
```

### Dockerfile の中身を理解する

`Dockerfile` は配布済みで変更不要ですが、何をしているか理解しておきましょう:

```dockerfile
FROM python:3.13-slim          # ベースイメージ（Python 3.13 入りの軽量 Linux）
WORKDIR /app                   # 作業ディレクトリを /app に設定
COPY requirements.txt .        # 依存パッケージ定義をコピー
RUN pip install --no-cache-dir -r requirements.txt  # パッケージをインストール
COPY . .                       # アプリケーションコードを全てコピー
ENV FLASK_ENV=production       # 環境変数を設定
EXPOSE 5000                    # コンテナがポート 5000 を使うことを宣言
CMD ["python", "app.py"]       # コンテナ起動時に Flask アプリを実行
```

Docker イメージは「アプリと実行環境をまとめたパッケージ」です。このイメージさえあれば、どこでも同じ環境でアプリを動かせます。

---

### 5-1. Docker イメージをビルドする

```bash
docker build -t book-review-api .
```

**コマンドの解説**:
- `docker build` — Dockerfile を元にイメージを作成する
- `-t book-review-api` — 作成するイメージに `book-review-api` という名前（タグ）を付ける
- `.` — Dockerfile がある場所（現在のディレクトリ）を指定

初回は数分かかることがあります（ベースイメージのダウンロードが必要なため）。

---

### 5-2. ECR にログインする

ECR にイメージを push するには、まず認証が必要です。

```bash
aws ecr get-login-password --region ap-northeast-1 \
  | docker login --username AWS --password-stdin <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com
```

`<アカウントID>` は講師から案内があります（12 桁の数字）。

**コマンドの解説**:
- `aws ecr get-login-password` — AWS に認証して一時的なパスワードを取得する
- `|` — パイプ。前のコマンドの出力を次のコマンドに渡す
- `docker login` — Docker に ECR の認証情報を設定する

`Login Succeeded` と表示されれば成功です。

---

### 5-3. Docker イメージにタグを付ける

ECR に push するには、イメージに ECR リポジトリの URL をタグとして付ける必要があります。

```bash
docker tag book-review-api:latest \
  <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/book-review-api:latest
```

**コマンドの解説**:
- `docker tag <元の名前> <新しい名前>` — イメージに別名を付ける
- `<アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/book-review-api` — ECR リポジトリのフル URL
- `:latest` — バージョンタグ。`latest` は「最新」という意味の慣例的なタグ名

---

### 5-4. ECR に push する

```bash
docker push <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/book-review-api:latest
```

イメージのレイヤーが順番にアップロードされます。全てのレイヤーが `Pushed` になれば完了です。

**push が完了したら講師に報告してください。**

> **うまくいかない場合**:
> - `denied: Your authorization token has expired` → 手順 5-2 の ECR ログインをやり直す
> - `name unknown: The repository does not exist` → リポジトリ名が正しいか確認する
> - push が途中で止まる → ネットワーク帯域の問題。しばらく待つか講師に相談

---

## 6. 本番動作確認（20 分）

講師が代表者のイメージを Fargate にデプロイします。デプロイ完了後、React UI で全員が動作確認を行います。

### 6-1. React UI にアクセスする

講師から共有された URL にブラウザでアクセスしてください。

### 6-2. 動作確認する

1. **書籍を登録する** — タイトル・著者・紹介文を入力して登録
2. **書籍一覧を確認する** — 登録した書籍が表示される
3. **書籍の詳細を開く** — 書籍カードをクリック
4. **書籍を編集する** — 紹介文を変更して保存
5. **レビューを投稿する** — レビュアー名・評価・コメントを入力して投稿
6. **レビュー一覧を確認する** — 投稿したレビューが表示される
7. **書籍を削除する** — 削除ボタンをクリック

---

## curl コマンド集

手元で API を直接テストしたい場合に使えるコマンド集です。`<BASE_URL>` は `http://localhost:5000` または ALB の DNS 名に置き換えてください。

```bash
# ---------- Books ----------

# 書籍一覧
curl -s <BASE_URL>/api/v1/books | python -m json.tool

# 書籍登録
curl -s -X POST <BASE_URL>/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Code", "author": "Robert C. Martin", "description": "読みやすいコードの書き方"}' \
  | python -m json.tool

# 書籍詳細
curl -s <BASE_URL>/api/v1/books/<book_id> | python -m json.tool

# 書籍更新
curl -s -X PUT <BASE_URL>/api/v1/books/<book_id> \
  -H "Content-Type: application/json" \
  -d '{"description": "コードの品質を高めるベストプラクティス集"}' \
  | python -m json.tool

# 書籍削除
curl -s -X DELETE <BASE_URL>/api/v1/books/<book_id> | python -m json.tool

# ---------- Reviews ----------

# レビュー一覧
curl -s <BASE_URL>/api/v1/books/<book_id>/reviews | python -m json.tool

# レビュー投稿
curl -s -X POST <BASE_URL>/api/v1/books/<book_id>/reviews \
  -H "Content-Type: application/json" \
  -d '{"reviewer": "Yohei", "rating": 5, "comment": "実務で即使える内容でした"}' \
  | python -m json.tool
```

---

## トラブルシューティング

### Flask が起動しない

```
ModuleNotFoundError: No module named 'flask'
```

仮想環境が有効か確認してください。プロンプトに `(.venv)` が表示されていなければ有効化が必要です:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### DynamoDB にアクセスできない

```
botocore.exceptions.NoCredentialsError: Unable to locate credentials
```

EC2 インスタンスロールが正しく設定されているか講師に確認してください。

### テーブルが見つからない

```
botocore.exceptions.ClientError: ... ResourceNotFoundException ...
```

`.env` ファイルの `TABLE_NAME` が正しく設定されているか確認してください:

```bash
cat .env
```

### import エラーが出る

```
ImportError: cannot import name 'books_bp' from 'routes.books'
```

`routes/books.py` の先頭で `books_bp = Blueprint('books', __name__)` が定義されているか確認してください。

### curl で Connection refused になる

Flask が起動しているか確認してください。また、`app.run(host='0.0.0.0', port=5000)` で 0.0.0.0 にバインドしているか確認してください。
