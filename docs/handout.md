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
└── Dockerfile          # Docker 設定（変更不要）
```

### 0-4. 環境変数を確認する

```bash
echo $TABLE_NAME
```

`book-review-api-<あなたのユーザー名>` と表示されれば OK です。

### 0-5. 依存パッケージをインストールする

```bash
pip install -r requirements.txt
```

---

## 1. Hello Flask（20 分）

> **SPEC.md を確認**: 「バックエンド設計 > アプリケーション構成」セクションで `app.py` の役割（Flask 初期化・CORS・Blueprint 登録・エラーハンドラー）を確認してください。

まずは Flask アプリを起動して動作確認します。

### 1-1. app.py の TODO を確認する

`app.py` を開いてください。以下の 2 つの TODO があります:

1. **Blueprint の登録** — `books_bp` と `reviews_bp` を import して `app.register_blueprint()` で登録する
2. **エラーハンドラーの定義** — 404 と 500 のエラーハンドラーを作る

### 1-2. Blueprint を登録する

`app.py` の TODO セクションに以下を追加してください:

```python
from routes.books import books_bp
from routes.reviews import reviews_bp

app.register_blueprint(books_bp, url_prefix='/api/v1')
app.register_blueprint(reviews_bp, url_prefix='/api/v1')
```

**ポイント**: `url_prefix='/api/v1'` を指定すると、各 Blueprint 内の `/books` は `/api/v1/books` としてアクセスできるようになります。

### 1-3. エラーハンドラーを定義する

```python
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({'error': 'Internal server error'}), 500
```

### 1-4. Flask を起動して動作確認する

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
> - 「DynamoDB テーブル設計」 — PK/SK の構造とシングルテーブル設計
> - 「実装する API エンドポイント > Books」 — 5 つのエンドポイントの一覧
> - 「リクエスト / レスポンス仕様」の Books 部分 — 各エンドポイントの入出力フォーマット

`routes/books.py` を開いて、5 つのエンドポイントを実装していきます。

### DynamoDB テーブルの構造

| PK | SK | 用途 |
|---|---|---|
| `BOOK#<book_id>` | `METADATA` | 書籍レコード |
| `BOOK#<book_id>` | `REVIEW#<review_id>` | レビューレコード |

### 2-1. GET /api/v1/books — 書籍一覧取得

`list_books()` 関数の TODO を実装します。

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

**ポイント**:
- `table.scan()` はテーブルの全アイテムを返す
- 書籍とレビューが混在しているので `SK == 'METADATA'` でフィルタする
- `PK` は `BOOK#<book_id>` 形式なので、`replace('BOOK#', '')` で book_id を取り出す

### 2-2. POST /api/v1/books — 書籍登録

`create_book()` 関数の TODO を実装します。

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

**ポイント**:
- `request.get_json()` でリクエストボディの JSON を取得する
- `uuid.uuid4()` で一意の ID を生成する
- `put_item()` で DynamoDB にアイテムを書き込む
- 成功時は `201 Created` を返す

### 動作確認: 書籍を登録して一覧を取得する

Flask を起動して curl で確認します:

```bash
python app.py
```

```bash
# 書籍を登録する
curl -s -X POST http://localhost:5000/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Code", "author": "Robert C. Martin", "description": "読みやすいコードの書き方"}' \
  | python -m json.tool

# 書籍一覧を取得する
curl -s http://localhost:5000/api/v1/books | python -m json.tool
```

### 2-3. GET /api/v1/books/<book_id> — 書籍詳細取得

`get_book()` 関数の TODO を実装します。

```python
@books_bp.route('/books/<book_id>', methods=['GET'])
def get_book(book_id):
    try:
        table = get_table()
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
    except (BotoCoreError, ClientError) as e:
        abort(500)
```

**ポイント**:
- `get_item()` は PK と SK を指定して 1 件を取得する
- レスポンスに `Item` キーがなければ、該当アイテムは存在しない

### 2-4. PUT /api/v1/books/<book_id> — 書籍更新

`update_book()` 関数の TODO を実装します。

```python
@books_bp.route('/books/<book_id>', methods=['PUT'])
def update_book(book_id):
    try:
        table = get_table()

        response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        if not response.get('Item'):
            return jsonify({'error': 'Book not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        allowed_fields = ['title', 'author', 'description']
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
    except (BotoCoreError, ClientError) as e:
        abort(500)
```

**ポイント**:
- `update_item()` は `UpdateExpression` で更新するフィールドを指定する
- `ExpressionAttributeNames` を使うのは、`title` などの一般的な単語が DynamoDB の予約語と衝突する可能性があるため
- `ReturnValues='ALL_NEW'` で更新後のアイテムを返してもらう

### 2-5. DELETE /api/v1/books/<book_id> — 書籍削除

`delete_book()` 関数の TODO を実装します。

```python
@books_bp.route('/books/<book_id>', methods=['DELETE'])
def delete_book(book_id):
    try:
        table = get_table()

        response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        if not response.get('Item'):
            return jsonify({'error': 'Book not found'}), 404

        table.delete_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})

        return jsonify({'message': 'Book deleted'})
    except (BotoCoreError, ClientError) as e:
        abort(500)
```

### 動作確認: 全 Books エンドポイント

```bash
# 書籍を登録する
curl -s -X POST http://localhost:5000/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Code", "author": "Robert C. Martin", "description": "読みやすいコードの書き方"}' \
  | python -m json.tool

# レスポンスの book_id を控えておく（例: abc123...）

# 書籍詳細を取得する
curl -s http://localhost:5000/api/v1/books/<book_id> | python -m json.tool

# 書籍を更新する
curl -s -X PUT http://localhost:5000/api/v1/books/<book_id> \
  -H "Content-Type: application/json" \
  -d '{"description": "コードの品質を高めるベストプラクティス集"}' \
  | python -m json.tool

# 書籍を削除する
curl -s -X DELETE http://localhost:5000/api/v1/books/<book_id> | python -m json.tool

# 一覧から消えていることを確認する
curl -s http://localhost:5000/api/v1/books | python -m json.tool
```

---

## 3. Reviews CRUD（40 分）

> **SPEC.md を確認**: 以下のセクションに目を通してから実装に入りましょう。
> - 「実装する API エンドポイント > Reviews」 — 2 つのエンドポイントの一覧
> - 「リクエスト / レスポンス仕様」の Reviews 部分 — リクエスト・レスポンスのフォーマットと rating の範囲制約
> - 「学習ポイントの設計意図 > パート3」 — `query` + `begins_with` と親リソース存在確認の意図

`routes/reviews.py` を開いて、2 つのエンドポイントを実装します。

### 3-1. GET /api/v1/books/<book_id>/reviews — レビュー一覧取得

`list_reviews()` 関数の TODO を実装します。

```python
@reviews_bp.route('/books/<book_id>/reviews', methods=['GET'])
def list_reviews(book_id):
    try:
        table = get_table()

        book_response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        if not book_response.get('Item'):
            return jsonify({'error': 'Book not found'}), 404

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
    except (BotoCoreError, ClientError) as e:
        abort(500)
```

**ポイント**:
- `query()` は `scan()` と違い、PK を指定してそのパーティション内だけを検索する（効率的）
- `Key('SK').begins_with('REVIEW#')` で、SK が `REVIEW#` で始まるアイテム（= レビュー）だけを取得する
- レビューを取得する前に、まず書籍の存在を `get_item()` で確認する

### 3-2. POST /api/v1/books/<book_id>/reviews — レビュー投稿

`create_review()` 関数の TODO を実装します。

```python
@reviews_bp.route('/books/<book_id>/reviews', methods=['POST'])
def create_review(book_id):
    try:
        table = get_table()

        book_response = table.get_item(Key={'PK': f'BOOK#{book_id}', 'SK': 'METADATA'})
        if not book_response.get('Item'):
            return jsonify({'error': 'Book not found'}), 404

        data = request.get_json()

        if not data or not all(key in data for key in ['reviewer', 'rating', 'comment']):
            return jsonify({'error': 'reviewer, rating, comment は必須です'}), 400

        if not isinstance(data['rating'], int) or data['rating'] < 1 or data['rating'] > 5:
            return jsonify({'error': 'rating is out of range (1-5)'}), 400

        review_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

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
    except (BotoCoreError, ClientError) as e:
        abort(500)
```

**ポイント**:
- `rating` は 1〜5 の整数のみ許可する
- SK を `REVIEW#<review_id>` にすることで、同じ PK（書籍）の下にレビューがぶら下がる

### 動作確認: Reviews エンドポイント

```bash
# まず書籍を登録する（book_id を控える）
curl -s -X POST http://localhost:5000/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Code", "author": "Robert C. Martin", "description": "読みやすいコードの書き方"}' \
  | python -m json.tool

# レビューを投稿する
curl -s -X POST http://localhost:5000/api/v1/books/<book_id>/reviews \
  -H "Content-Type: application/json" \
  -d '{"reviewer": "Yohei", "rating": 5, "comment": "実務で即使える内容でした"}' \
  | python -m json.tool

# レビュー一覧を取得する
curl -s http://localhost:5000/api/v1/books/<book_id>/reviews | python -m json.tool
```

---

## 4. エラーハンドリング確認（20 分）

> **SPEC.md を確認**: 「エラーハンドリング方針」セクションで、4 つのレイヤー（バリデーション / リソース確認 / DynamoDB 例外 / 未捕捉例外）の全体像を確認してください。

ここまでの実装で、エラーハンドリングも含まれています。正しく動作するか確認しましょう。

### 4-1. バリデーションエラー（400）

```bash
# 必須フィールドが足りない場合
curl -s -X POST http://localhost:5000/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Code"}' \
  | python -m json.tool

# rating が範囲外の場合
curl -s -X POST http://localhost:5000/api/v1/books/<book_id>/reviews \
  -H "Content-Type: application/json" \
  -d '{"reviewer": "Yohei", "rating": 10, "comment": "テスト"}' \
  | python -m json.tool
```

### 4-2. リソース不存在（404）

```bash
# 存在しない書籍を取得する
curl -s http://localhost:5000/api/v1/books/nonexistent-id | python -m json.tool

# 存在しない書籍のレビューを取得する
curl -s http://localhost:5000/api/v1/books/nonexistent-id/reviews | python -m json.tool
```

### エラーハンドリングのまとめ

| レイヤー | 手法 | 対象 |
|---|---|---|
| バリデーション | `400` レスポンス | 必須フィールド欠損、rating 範囲外 |
| リソース確認 | `404` レスポンス | 書籍が存在しない |
| DynamoDB 例外 | `try-except` + `abort(500)` | `BotoCoreError` / `ClientError` |
| 未捕捉例外 | `@app.errorhandler(500)` | その他のエラー |

---

## 5. デプロイ（25 分）

> **SPEC.md を確認**: 「ツールバージョン一覧」セクションで、Docker ベースイメージ（`python:3.13-slim`）と AWS CLI v2 を使うことを確認してください。

完成した API を Docker イメージにビルドし、ECR に push します。

### 5-1. Docker イメージをビルドする

```bash
docker build -t book-review-api .
```

### 5-2. ECR にログインする

```bash
aws ecr get-login-password --region ap-northeast-1 \
  | docker login --username AWS --password-stdin <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com
```

`<アカウントID>` は講師から案内があります。

### 5-3. Docker イメージにタグを付ける

```bash
docker tag book-review-api:latest \
  <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/book-review-api:latest
```

### 5-4. ECR に push する

```bash
docker push <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/book-review-api:latest
```

push が完了したら講師に報告してください。

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

`pip install -r requirements.txt` を実行してください。

### DynamoDB にアクセスできない

```
botocore.exceptions.NoCredentialsError: Unable to locate credentials
```

EC2 インスタンスロールが正しく設定されているか講師に確認してください。

### テーブルが見つからない

```
botocore.exceptions.ClientError: ... ResourceNotFoundException ...
```

環境変数 `TABLE_NAME` が正しく設定されているか確認してください:

```bash
echo $TABLE_NAME
```

### import エラーが出る

```
ImportError: cannot import name 'books_bp' from 'routes.books'
```

`routes/books.py` の先頭で `books_bp = Blueprint('books', __name__)` が定義されているか確認してください。

### curl で Connection refused になる

Flask が起動しているか確認してください。また、`app.run(host='0.0.0.0', port=5000)` で 0.0.0.0 にバインドしているか確認してください。
