# 6. 本番動作確認（20 分）

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
BASE_URL=""         # http://localhost:5000 または ALB の DNS 名
BOOK_ID=""          # 書籍登録時のレスポンスに含まれる book_id

# ---------- Books ----------

# 書籍一覧
curl -v ${BASE_URL}/api/v1/books

# 書籍登録
curl -v -X POST ${BASE_URL}/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Code", "author": "Robert C. Martin", "description": "読みやすいコードの書き方"}'

# 書籍詳細
curl -v ${BASE_URL}/api/v1/books/${BOOK_ID}

# 書籍更新
curl -v -X PUT ${BASE_URL}/api/v1/books/${BOOK_ID} \
  -H "Content-Type: application/json" \
  -d '{"description": "コードの品質を高めるベストプラクティス集"}'

# 書籍削除
curl -v -X DELETE ${BASE_URL}/api/v1/books/${BOOK_ID}

# ---------- Reviews ----------

# レビュー一覧
curl -v ${BASE_URL}/api/v1/books/${BOOK_ID}/reviews

# レビュー投稿
curl -v -X POST ${BASE_URL}/api/v1/books/${BOOK_ID}/reviews \
  -H "Content-Type: application/json" \
  -d '{"reviewer": "Yohei", "rating": 5, "comment": "実務で即使える内容でした"}'
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

---

[← 5. デプロイ](06-deploy.md) | [イントロダクションに戻る →](00-introduction.md)
