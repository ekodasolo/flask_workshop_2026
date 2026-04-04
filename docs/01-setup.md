# 0. 環境確認（10 分）

> **SPEC.md を確認**: 「概要」「システム構成」「ディレクトリ構成」セクションを読んで、今日作るものの全体像を把握してください。

### 0-1. Code Server にアクセスする

講師から共有された URL にブラウザでアクセスしてください。

### 0-2. 自分の作業ディレクトリに移動する

講師が用意したディレクトリに移動します。`<user_name>` は自分のユーザー名に置き換えてください。

```bash
cd ~/projects/flask_workshop/<user_name>
```

### 0-3. ハンズオン教材をクローンする

GitHub からハンズオン教材をクローンします。

```bash
git clone https://github.com/ekodasolo/flask_workshop_2026
```

クローンしたリポジトリの `starter/` ディレクトリに骨格コード（TODO 付き）が入っています。これを `working/` ディレクトリにコピーして、`working/` 以下で作業します。

```bash
cp -r flask_workshop_2026/starter flask_workshop_2026/working
cd flask_workshop_2026/working
```

> **なぜコピーするのか**: `starter/` はオリジナルの骨格コードとして残しておきます。実装に詰まったときに元のコードを確認したり、最初からやり直したりできます。

### 0-4. ファイル構成を確認する

`working/` ディレクトリの中身を確認しましょう。

```
working/
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

### 0-5. Python 仮想環境を作成する

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
(.venv) user@host:~/projects/flask_workshop/<user_name>/flask_workshop_2026/working$
```

> **重要**: ターミナルを開き直したら、毎回 `source .venv/bin/activate` を実行してください。有効化を忘れるとグローバル環境にパッケージがインストールされてしまいます。
>
> 仮想環境を抜けたいときは `deactivate` コマンドを実行します（今回のハンズオンでは基本的に抜ける必要はありません）。

### 0-6. 環境変数を設定する

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

### 0-7. 依存パッケージをインストールする

```bash
pip install -r requirements.txt
```

> 仮想環境が有効な状態（プロンプトに `(.venv)` が表示されている状態）で実行してください。パッケージは `.venv/` の中にインストールされ、他の人の環境には影響しません。

---

[← イントロダクション](00-introduction.md) | [次へ: 1. Hello Flask →](02-hello-flask.md)
