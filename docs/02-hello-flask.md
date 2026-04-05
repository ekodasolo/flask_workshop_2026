# 1. Hello Flask（20 分）

> **API-SPEC.md を確認**: 「バックエンド設計 > アプリケーション構成」セクションで `app.py` の役割（Flask 初期化・CORS・Blueprint 登録・エラーハンドラー）を確認してください。

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
curl -v http://localhost:5000/api/v1/books
```

**curl `-v` オプションの出力の読み方**:

`-v`（verbose）を付けると、HTTP のリクエストとレスポンスの詳細が表示されます。REST API では「何を送って、何が返ってきたか」を確認することが重要なので、このハンズオンでは全て `-v` を使います。

出力サンプル:

```
*   Trying 127.0.0.1:5000...
* Connected to localhost (127.0.0.1) port 5000    ← サーバーへの接続情報
> GET /api/v1/books HTTP/1.1                       ← リクエスト行（メソッド + URI + HTTPバージョン）
> Host: localhost:5000                             ← リクエストヘッダー
> User-Agent: curl/8.x.x                          ←
> Accept: */*                                      ←
>                                                  ← リクエスト終了（空行）
< HTTP/1.1 200 OK                                  ← ステータス行（HTTPバージョン + ステータスコード）
< Content-Type: application/json                   ← レスポンスヘッダー
< Content-Length: 14                               ←
<                                                  ← レスポンスヘッダー終了（空行）
{"books": []}                                      ← レスポンスボディ（JSON）
```

読み方のポイント:
- **`>`（リクエスト）** — 自分がサーバーに送った内容。メソッド（GET / POST / PUT / DELETE）と URI を確認する
- **`<`（レスポンス）** — サーバーから返ってきた内容。ステータスコード（200, 201, 400, 404 など）を確認する
- **最後の行** — レスポンスボディ。API が返した JSON データ

> **補足**: 出力が冗長に感じる場合は `-v` の代わりに `-s`（silent）を使うと、レスポンスボディだけが表示されます。
> ```bash
> curl -s http://localhost:5000/api/v1/books
> ```

まだ `books.py` の中身を実装していないので、空のレスポンスまたはエラーが返りますが、Flask が起動していれば OK です。

確認が終わったら `Ctrl+C` で Flask を停止してください。

---

[← 0. 環境確認](01-setup.md) | [次へ: 2. Books CRUD →](03-books-crud.md)
