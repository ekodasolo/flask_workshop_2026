# 5. デプロイ（25 分）

> **SPEC.md を確認**: 「ツールバージョン一覧」セクションで、Docker ベースイメージ（`python:3.13-slim`）と AWS CLI v2 を使うことを確認してください。

完成した API を Docker イメージにビルドし、AWS の ECR（Elastic Container Registry）に push します。push したイメージは、講師が AWS Fargate にデプロイして本番環境で動かします。

### デプロイの全体像

```
[あなたのコード]
     │
     ▼  docker image build
[Docker イメージ]  ← ローカルに作成される
     │
     ▼  docker image push
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
ENV AWS_DEFAULT_REGION=ap-northeast-1  # boto3 が使う AWS リージョン
EXPOSE 5000                    # コンテナがポート 5000 を使うことを宣言
CMD ["python", "app.py"]       # コンテナ起動時に Flask アプリを実行
```

Docker イメージは「アプリと実行環境をまとめたパッケージ」です。このイメージさえあれば、どこでも同じ環境でアプリを動かせます。

> **補足: ECS での環境変数について**
>
> AWS ECS（Fargate）でコンテナを実行する場合、コンテナに設定される環境変数は **TaskDefinition に定義されたものだけ** が反映されます。Dockerfile の `ENV` で指定した値は、ローカルで `docker container run` する場合には有効ですが、ECS では TaskDefinition 側の設定で上書き・管理されます。今回は CDK の TaskDefinition で `TABLE_NAME` と `AWS_DEFAULT_REGION` を設定しています。

---

### 5-1. Docker イメージをビルドする

```bash
docker image build -t book-review-api .
```

**コマンドの解説**:
- `docker image build` — Dockerfile を元にイメージを作成する
- `-t book-review-api` — 作成するイメージに `book-review-api` という名前（タグ）を付ける
- `.` — Dockerfile がある場所（現在のディレクトリ）を指定

初回は数分かかることがあります（ベースイメージのダウンロードが必要なため）。

---

### 5-2. ローカルでコンテナの起動を確認する

ECR に push する前に、ビルドしたイメージがローカルで正常に起動するか確認しましょう。

```bash
docker container run --rm -p 5000:5000 book-review-api
```

Flask の起動ログが表示されれば OK です。別のターミナルからヘルスチェックを確認します:

```bash
curl -v http://localhost:5000/
```

`{"status":"ok"}` が返れば、コンテナは正常に動作しています。`Ctrl+C` でコンテナを停止してください。

> **なぜローカルで確認するのか**: ECS にデプロイした後にコンテナが起動に失敗すると、CloudFormation がスタック全体を Rollback してしまいます。import エラーや環境変数の不足など、アプリケーションレベルの問題はローカルで事前に検出できます。

**コマンドの解説**:
- `docker container run` — イメージからコンテナを起動する
- `--rm` — コンテナ停止時に自動的に削除する
- `-p 5000:5000` — ホストのポート 5000 をコンテナのポート 5000 に接続する

---

### 5-3. ECR にログインする

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

### 5-4. Docker イメージにタグを付ける

ECR に push するには、イメージに ECR リポジトリの URL をタグとして付ける必要があります。タグには `<ユーザー名>_<時刻>` の形式を使います。

```bash
docker image tag book-review-api:latest \
  <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/<ECRリポジトリ名>:<ユーザー名>_<hhmm>
```

`<ECRリポジトリ名>` は講師から案内があります。CDK で作成されたリポジトリ名は `book-review-api-<環境名>-<ユーザー名>-repo` の形式です（例: `book-review-api-workshop-fuji-repo`）。

例えば、ユーザー名が `fuji`、環境名が `workshop`、現在 15:30 なら:

```bash
docker image tag book-review-api:latest \
  <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/book-review-api-workshop-fuji-repo:fuji_1530

docker image tag book-review-api:latest \
  <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/book-review-api-workshop-fuji-repo:latest

```

**コマンドの解説**:
- `docker image tag <元の名前> <新しい名前>` — イメージに別名を付ける
- `<アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/<ECRリポジトリ名>` — ECR リポジトリのフル URL
- `:<ユーザー名>_<hhmm>` — イメージタグ。誰がいつビルドしたかを識別できる

> **なぜ `latest` ではなくユーザー名 + 時刻を使うのか**: ECS で問題が起きたとき、実行中のタスクがどのイメージから起動されたかを特定する必要があります。`latest` だけでは全員のイメージが同じタグになり、区別がつきません。再ビルドして push し直した場合も、前のタグが ECR に残るので履歴を追えます。

---

### 5-5. ECR に push する

```bash
docker image push <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/<ECRリポジトリ名>:<ユーザー名>_<hhmm>
docker image push <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/<ECRリポジトリ名>:latest
```

イメージのレイヤーが順番にアップロードされます。全てのレイヤーが `Pushed` になれば完了です。

**push が完了したら講師に報告してください。**

> **うまくいかない場合**:
> - `denied: Your authorization token has expired` → 手順 5-2 の ECR ログインをやり直す
> - `name unknown: The repository does not exist` → リポジトリ名が正しいか確認する
> - push が途中で止まる → ネットワーク帯域の問題。しばらく待つか講師に相談

---

[← 4. エラーハンドリング確認](05-error-handling.md) | [次へ: 6. 本番動作確認 →](07-production-test.md)
