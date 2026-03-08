# 講師用進行ガイド

## 概要

| 項目 | 内容 |
|---|---|
| テーマ | Flask + DynamoDB REST API ハンズオン |
| 対象 | Python ある程度書ける・Web 基礎知識あり |
| 時間 | 半日（3.5 時間） |
| 人数 | params.ts の `usernames` で管理 |

---

## タイムライン

| # | パート | 時間 | 開始目安 | 内容 |
|---|--------|------|----------|------|
| 0 | イントロ | 20 分 | 0:00 | システム概要・DynamoDB データモデル説明・環境確認 |
| 1 | Hello Flask | 20 分 | 0:20 | app.py を書いて curl で疎通確認 |
| 2 | Books CRUD | 60 分 | 0:40 | 5 エンドポイントを実装 |
| - | (休憩) | 10 分 | 1:40 | |
| 3 | Reviews CRUD | 40 分 | 1:50 | 2 エンドポイントを実装 |
| 4 | エラーハンドリング | 20 分 | 2:30 | abort / errorhandler / try-except の確認 |
| 5 | デプロイ | 25 分 | 2:50 | Docker ビルド → ECR push |
| 6 | 本番動作確認 | 20 分 | 3:15 | Fargate デプロイ → React UI で確認 |
| - | バッファ | 残り | 3:35 | 詰まった人のフォロー |

**合計: 約 3 時間 35 分**

---

## 事前準備チェックリスト

### インフラ（CDK でデプロイ）

- [ ] `infra/lib/params.ts` の `common.account` に実際の AWS アカウント ID を設定
- [ ] `infra/lib/params.ts` の `common.usernames` に学習者のユーザー名リストを設定
- [ ] `cdk deploy` で以下のリソースを作成:
  - VPC（パブリック / プライベートサブネット）
  - DynamoDB テーブル（`book-review-api-<username>` x 人数分）
  - ECR リポジトリ（`book-review-api`）
  - ECS クラスター / Fargate タスク定義 / ALB
- [ ] CDK の出力から ALB の DNS 名を控える

### EC2 / Code Server

- [ ] EC2 インスタンスを起動（Amazon Linux 2023 推奨）
- [ ] Code Server をインストール・起動設定
- [ ] セキュリティグループで Code Server のポートを許可
- [ ] 学習者ごとのディレクトリを作成:
  ```bash
  for user in user1 user2; do
    mkdir -p /home/$user/app
    cp -r starter/app/* /home/$user/app/
  done
  ```
- [ ] 各ユーザーの環境変数 `TABLE_NAME` を設定:
  ```bash
  # .bashrc に追加
  export TABLE_NAME=book-review-api-<username>
  ```
- [ ] EC2 インスタンスロールに以下のポリシーをアタッチ:
  - DynamoDB: 対象テーブルへの CRUD 権限
  - ECR: `GetAuthorizationToken`, `BatchCheckLayerAvailability`, `PutImage` 等
- [ ] Python 3.13 と pip がインストールされていることを確認
- [ ] Docker がインストールされていることを確認
- [ ] AWS CLI v2 がインストールされていることを確認

### フロントエンド（Amplify）

- [ ] Amplify アプリを作成
- [ ] 環境変数に ALB の DNS 名を設定（`VITE_API_BASE_URL`）
- [ ] React アプリをビルド・デプロイ
- [ ] 動作確認: ブラウザでアクセスし、Mock Mode でない状態で表示されること

### 最終確認

- [ ] Code Server に各ユーザーでログインしてスターターコードが配置されていること
- [ ] `pip install -r requirements.txt` が成功すること
- [ ] `echo $TABLE_NAME` で正しいテーブル名が表示されること
- [ ] `python app.py` で Flask が起動すること（エンドポイントは未実装でOK）

---

## パートごとの進行メモ

### パート 0: イントロ（20 分）

**説明する内容**:
1. 今日のゴール: Flask + DynamoDB で REST API を作って、Fargate にデプロイして React UI で確認する
2. システム構成図を見せて全体像を説明する
3. DynamoDB のシングルテーブル設計を説明する:
   - PK/SK の概念
   - なぜ `BOOK#` や `REVIEW#` というプレフィックスを付けるのか
   - `scan` vs `query` の違い
4. Code Server へのアクセス方法を案内する

**詰まりポイント**:
- Code Server のアクセス URL を間違える → 正しい URL を再案内
- ブラウザのキャッシュで古いページが表示される → シークレットウィンドウを案内

### パート 1: Hello Flask（20 分）

**説明する内容**:
1. Blueprint とは何か — ルーティングを分割管理する仕組み
2. `url_prefix` の効果 — Blueprint 内の `/books` が `/api/v1/books` になる
3. `errorhandler` の仕組み — `abort()` で発生したエラーをキャッチして JSON レスポンスに変換

**詰まりポイントと対処法**:
| 症状 | 原因 | 対処 |
|---|---|---|
| `ModuleNotFoundError: No module named 'flask'` | pip install 忘れ | `pip install -r requirements.txt` |
| `ImportError: cannot import name 'books_bp'` | import パス間違い | `from routes.books import books_bp` を確認 |
| Flask 起動後に curl が通らない | 別ターミナルを開いていない | ターミナルの分割を案内 |

### パート 2: Books CRUD（60 分）

**進行のコツ**:
- まず `list_books()` と `create_book()` を実装させて、curl で登録→一覧を確認する成功体験を作る
- `update_book()` の `UpdateExpression` は難しいので、丁寧に説明する
- 都度 curl で動作確認する習慣を付けさせる

**詰まりポイントと対処法**:
| 症状 | 原因 | 対処 |
|---|---|---|
| `scan()` の結果が空 | まだ `put_item` していない | 先に POST で登録させる |
| `get_item` で Item が取れない | PK/SK の形式間違い | `f'BOOK#{book_id}'` と `'METADATA'` を確認 |
| `update_item` でエラー | ExpressionAttributeNames の書き方 | `#field` と `:field` の対応を確認 |
| `400` が返る | curl の `-H "Content-Type: application/json"` 忘れ | ヘッダーを追加 |
| `Internal server error` | テーブルが存在しない / 権限不足 | `$TABLE_NAME` と IAM ロールを確認 |

**学習者が早く終わった場合**:
- 書籍を複数登録して一覧表示の動作を確認させる
- 存在しない book_id で GET/PUT/DELETE して 404 を確認させる

### パート 3: Reviews CRUD（40 分）

**説明する内容**:
1. `query` と `scan` の違い — `query` は PK を指定するので効率的
2. `begins_with` の使い方 — SK のプレフィックスでフィルタ
3. 親リソースの存在確認パターン — レビュー操作の前に書籍の存在を確認する

**詰まりポイントと対処法**:
| 症状 | 原因 | 対処 |
|---|---|---|
| `NameError: name 'Key' is not defined` | import 忘れ | `from boto3.dynamodb.conditions import Key` を確認 |
| `query` の結果が空 | PK の形式間違い | `f'BOOK#{book_id}'` を確認 |
| 書籍の存在確認で 404 になる | book_id の間違い | 正しい book_id を使っているか確認 |
| rating のバリデーションが効かない | 文字列で送っている | JSON で `"rating": 5`（数値）を送っているか確認 |

### パート 4: エラーハンドリング確認（20 分）

**説明する内容**:
1. パート 2〜3 で既にエラーハンドリングを実装済みであることを伝える
2. 改めて curl で各エラーパターンを確認させる
3. エラーレスポンスが全て `{"error": "..."}` の形式に統一されていることを確認

**確認させるエラーパターン**:
- 必須フィールド欠損 → 400
- 存在しない book_id → 404
- rating 範囲外 → 400

### パート 5: デプロイ（25 分）

**事前に画面共有で見せる内容**:
1. Dockerfile の中身を説明する
2. ECR へのログイン〜push の流れを説明する

**詰まりポイントと対処法**:
| 症状 | 原因 | 対処 |
|---|---|---|
| `docker build` が遅い | ネットワーク帯域 | 待つ（初回は数分かかる） |
| ECR ログイン失敗 | アカウント ID の間違い | 正しいアカウント ID を再案内 |
| `docker push` 失敗 | タグ付けミス | `docker tag` コマンドを再確認 |
| `denied: Your authorization token has expired` | トークン期限切れ | 再度 `aws ecr get-login-password` |

**全員の push 完了を待つ**:
- ECR コンソールで push されたイメージを確認する
- 全員が完了したら次のパートに進む

### パート 6: 本番動作確認（20 分）

**講師の作業**:
1. ECR に push されたイメージから代表者を 1 人選ぶ
2. Fargate タスク定義のイメージ URI を更新する:
   ```
   <アカウントID>.dkr.ecr.ap-northeast-1.amazonaws.com/book-review-api:latest
   ```
3. ECS サービスを更新してデプロイする（新しいタスクが起動するまで 1〜2 分）
4. ALB のヘルスチェックが healthy になったことを確認する

**学習者への案内**:
1. React UI の URL を共有する
2. 全員で書籍登録・レビュー投稿をしてもらう
3. 他の人が登録したデータも見えることを確認させる（同じ DynamoDB テーブルを参照しているため）

---

## Fargate デプロイ手順（詳細）

### 1. ECS タスク定義の更新

AWS コンソールまたは CLI でタスク定義を更新します。

```bash
# 現在のタスク定義を取得
aws ecs describe-task-definition \
  --task-definition book-review-api \
  --query 'taskDefinition' > task-def.json

# task-def.json の containerDefinitions[0].image を新しいイメージ URI に変更
# 不要なフィールド（taskDefinitionArn, revision, status, registeredAt, registeredBy, compatibilities, requiresAttributes）を削除

# 新しいタスク定義を登録
aws ecs register-task-definition --cli-input-json file://task-def.json
```

### 2. ECS サービスの更新

```bash
aws ecs update-service \
  --cluster book-review-api \
  --service book-review-api \
  --task-definition book-review-api:<新しいリビジョン> \
  --force-new-deployment
```

### 3. デプロイ状況の確認

```bash
# サービスのイベントを確認
aws ecs describe-services \
  --cluster book-review-api \
  --services book-review-api \
  --query 'services[0].events[:5]'

# タスクの状態を確認
aws ecs list-tasks \
  --cluster book-review-api \
  --service-name book-review-api
```

### 4. ALB ヘルスチェックの確認

新しいタスクが RUNNING になり、ALB のヘルスチェックが healthy になるまで 1〜2 分待ちます。

```bash
# ターゲットグループのヘルス状態を確認
aws elbv2 describe-target-health \
  --target-group-arn <ターゲットグループARN>
```

---

## 緊急時の対応

### Flask アプリが動かない場合

学習者のコードに問題がある場合は `answer/app/` の完成形コードを見せて差分を確認させる。

### DynamoDB にアクセスできない場合

```bash
# EC2 インスタンスロールの確認
aws sts get-caller-identity

# テーブルが存在するか確認
aws dynamodb describe-table --table-name book-review-api-<username>
```

### Fargate のタスクが起動しない場合

```bash
# 停止したタスクの理由を確認
aws ecs describe-tasks \
  --cluster book-review-api \
  --tasks <タスクARN> \
  --query 'tasks[0].stoppedReason'

# CloudWatch Logs でコンテナのログを確認
aws logs get-log-events \
  --log-group-name /ecs/book-review-api \
  --log-stream-name <ログストリーム名>
```

### React UI から API に接続できない場合

1. CORS エラー → Flask アプリで `CORS(app)` が設定されているか確認
2. Network Error → ALB の DNS 名が正しいか確認
3. 502 Bad Gateway → Fargate タスクが起動しているか確認
