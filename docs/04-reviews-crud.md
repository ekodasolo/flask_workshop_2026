# 3. Reviews CRUD（40 分）

> **API-SPEC.md を確認**: 以下のセクションに目を通してから実装に入りましょう。
> - 「API エンドポイント > Reviews」 — 2 つのエンドポイントの一覧
> - 「リクエスト / レスポンス仕様」の Reviews 部分 — リクエスト・レスポンスのフォーマットと rating の範囲制約
> - 「各エンドポイントのロジックフロー」の Reviews 部分 — `query` + `begins_with` と親リソース存在確認

このパートでは `routes/reviews.py` を開いて、2 つのエンドポイントを実装します。

### REST API 解説 — ネストしたリソースと URI 設計

パート 2 では `/books` という URI で書籍リソースを操作しました。レビューは「書籍に属するリソース（サブリソース）」なので、REST API では URI にその親子関係を反映させます。

```
書籍（親リソース）:       /books/<book_id>
レビュー（子リソース）:   /books/<book_id>/reviews
```

URI を見るだけで「`book_id` の書籍に属するレビュー」という関係が読み取れます。これが REST API の URI 設計の基本原則です。

パート 2 の Books API と並べてみましょう:

| API 操作 | HTTP メソッド + URI | リソースの関係 |
|---|---|---|
| ListBooks | `GET /books` | 書籍の一覧 |
| CreateBook | `POST /books` | 書籍の作成 |
| GetBook | `GET /books/<book_id>` | 特定の書籍 |
| ListReviews | `GET /books/<book_id>/reviews` | 特定の書籍の**レビュー一覧** |
| CreateReview | `POST /books/<book_id>/reviews` | 特定の書籍に**レビューを投稿** |

URI が `/books/<book_id>/reviews` のようにネストすることで、「どの書籍のレビューか」が URI だけで表現されています。

Flask ではこのネストした URI をそのままルート定義に書きます:

```python
@reviews_bp.route('/books/<book_id>/reviews', methods=['GET'])
def list_reviews(book_id):   # ← URL の <book_id> がここに入る
    # book_id を使って、この書籍に紐づくレビューを取得する
```

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
        # DynamoDB を query して PK が一致し、SK が 'REVIEW#' で始まるアイテムを取得する
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

API-SPEC.md の具体例で考えてみましょう。テーブルに 4 件のアイテムがある場合:

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
        # DynamoDB にアイテムを書き込む
        item = {
            'PK': f'BOOK#{book_id}',
            'SK': f'REVIEW#{review_id}',
            'reviewer': data['reviewer'],
            'rating': data['rating'],
            'comment': data['comment'],
            'created_at': created_at,
        }
        table.put_item(Item=item)

        # 登録したレビューオブジェクトを返す
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
curl -v -X POST http://localhost:5000/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Code", "author": "Robert C. Martin", "description": "読みやすいコードの書き方"}'

# 2. レビューを投稿する（<book_id> を手順 1 の結果に置き換える）
curl -v -X POST http://localhost:5000/api/v1/books/<book_id>/reviews \
  -H "Content-Type: application/json" \
  -d '{"reviewer": "Yohei", "rating": 5, "comment": "実務で即使える内容でした"}'

# 3. もう 1 件レビューを投稿する
curl -v -X POST http://localhost:5000/api/v1/books/<book_id>/reviews \
  -H "Content-Type: application/json" \
  -d '{"reviewer": "Tanaka", "rating": 4, "comment": "初心者にもおすすめ"}'

# 4. レビュー一覧を取得する（2 件返ることを確認）
curl -v http://localhost:5000/api/v1/books/<book_id>/reviews

# 5. 存在しない書籍のレビューを取得する（404 が返ることを確認）
curl -v http://localhost:5000/api/v1/books/nonexistent-id/reviews
```

全て正常に動作すれば、Reviews CRUD は完成です。

### ここまでのまとめ — サブリソースの REST API 設計

パート 2（Books）とパート 3（Reviews）を合わせて、REST API 全体の設計を振り返りましょう。

| CRUD | API 操作 | HTTP メソッド + URI | Flask 関数 | DynamoDB 操作 |
|---|---|---|---|---|
| **R**ead（一覧） | ListBooks | `GET /books` | `list_books()` | `scan()` |
| **C**reate | CreateBook | `POST /books` | `create_book()` | `put_item()` |
| **R**ead（1件） | GetBook | `GET /books/<id>` | `get_book()` | `get_item()` |
| **U**pdate | UpdateBook | `PUT /books/<id>` | `update_book()` | `update_item()` |
| **D**elete | DeleteBook | `DELETE /books/<id>` | `delete_book()` | `delete_item()` |
| **R**ead（一覧） | ListReviews | `GET /books/<id>/reviews` | `list_reviews()` | `query()` |
| **C**reate | CreateReview | `POST /books/<id>/reviews` | `create_review()` | `put_item()` |

REST API の設計原則が一貫していることに注目してください:

- **URI がリソースの構造を表す** — `/books` は書籍、`/books/<id>/reviews` はその書籍のレビュー
- **HTTP メソッドが操作を表す** — GET で取得、POST で作成
- **同じ CRUD パターンが親子で繰り返される** — Books も Reviews も「一覧取得 + 作成」の組み合わせ

---

[← 2. Books CRUD](03-books-crud.md) | [次へ: 4. エラーハンドリング確認 →](05-error-handling.md)
