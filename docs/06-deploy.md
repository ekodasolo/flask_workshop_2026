# 5. デプロイ（25 分）

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

[← 4. エラーハンドリング確認](05-error-handling.md) | [次へ: 6. 本番動作確認 →](07-production-test.md)
