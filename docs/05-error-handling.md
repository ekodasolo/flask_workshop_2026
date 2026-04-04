# 4. エラーハンドリング確認（20 分）

> **API-SPEC.md を確認**: 「エラーハンドリング方針」セクションで、4 つのレイヤー（バリデーション / リソース確認 / DynamoDB 例外 / 未捕捉例外）の全体像を確認してください。

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

[← 3. Reviews CRUD](04-reviews-crud.md) | [次へ: 5. デプロイ →](06-deploy.md)
