# 2. Books CRUD（60 分）

> **SPEC.md を確認**: 以下のセクションに目を通してから実装に入りましょう。
> - 「DynamoDB テーブル設計」 — PK/SK の構造とシングルテーブル設計、具体例によるデータの流れ
> - 「実装する API エンドポイント > Books」 — 5 つのエンドポイントの一覧
> - 「リクエスト / レスポンス仕様」の Books 部分 — 各エンドポイントの入出力フォーマット

このパートでは、`routes/books.py` を開いて 5 つのエンドポイントを実装します。
ファイルには各関数の雛形と TODO コメントが用意されているので、コメントの指示に従ってコードを書いていきましょう。

### Flask 解説 — ルートの書き方と REST API の作法

このパートで初めて Flask のルート関数を書きます。ルート関数の基本構造を理解しましょう。

```python
@books_bp.route('/books', methods=['GET'])   # ← どの URL・メソッドに反応するか
def list_books():                             # ← 関数名は自由（分かりやすい名前を付ける）
    # ... 処理 ...
    return jsonify({'books': [...]})          # ← JSON レスポンスを返す
```

REST API では、**URI（リソースの場所）** と **HTTP メソッド（操作の種類）** の組み合わせで「何に対して何をするか」を表現します。Flask のルート定義は、まさにこの REST API の設計をそのままコードに落とし込んだものです。

| API 操作 | URI + メソッド | Flask のルート定義 |
|---|---|---|
| ListBooks（一覧取得） | `GET /books` | `@route('/books', methods=['GET'])` |
| CreateBook（新規登録） | `POST /books` | `@route('/books', methods=['POST'])` |
| GetBook（詳細取得） | `GET /books/<book_id>` | `@route('/books/<book_id>', methods=['GET'])` |
| UpdateBook（更新） | `PUT /books/<book_id>` | `@route('/books/<book_id>', methods=['PUT'])` |
| DeleteBook（削除） | `DELETE /books/<book_id>` | `@route('/books/<book_id>', methods=['DELETE'])` |

ポイントは、`/books` という **同じ URI** でも HTTP メソッドが違えば異なる操作になることです。URI は「どのリソースに対して」、メソッドは「何をするか」を表しています。特定の書籍を操作する場合は `/books/<book_id>` のように URI にリソースの ID を含めます。

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

### ここまでのまとめ — REST API と DynamoDB 操作の対応

REST API では、リソース（ここでは書籍）に対する操作を **CRUD**（Create / Read / Update / Delete）と呼びます。HTTP メソッドはこの CRUD に対応しており、URI でリソースを、メソッドで操作を指定するのが REST の基本原則です。

| CRUD | API 操作 | HTTP メソッド + URI | Flask 関数 | DynamoDB 操作 |
|---|---|---|---|---|
| **R**ead（一覧） | ListBooks | `GET /books` | `list_books()` | `scan()` |
| **C**reate | CreateBook | `POST /books` | `create_book()` | `put_item()` |
| **R**ead（1件） | GetBook | `GET /books/<id>` | `get_book()` | `get_item()` |
| **U**pdate | UpdateBook | `PUT /books/<id>` | `update_book()` | `update_item()` |
| **D**elete | DeleteBook | `DELETE /books/<id>` | `delete_book()` | `delete_item()` |

この表の左から右へ、「REST API の設計」→「Flask での実装」→「DynamoDB の操作」と、設計がコードに一貫してマッピングされていることがわかります。

---

[← 1. Hello Flask](02-hello-flask.md) | [次へ: 3. Reviews CRUD →](04-reviews-crud.md)
