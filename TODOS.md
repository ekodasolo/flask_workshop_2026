# 実装タスク一覧

## 凡例

- `[ ]` 未着手
- `[x]` 完了
- 優先度: 高（他がブロックされる） / 中 / 低

---

## 1. バックエンド（Flask アプリ）

### 1-1. プロジェクト基盤

- [x] ディレクトリ構成を作成（`app/`, `routes/`, `db/`）
- [x] `requirements.txt` を作成（flask 3.1.3 / flask-cors 6.0.2 / boto3 1.42.x）
- [x] `db/dynamo.py` を実装（`get_table()` / 環境変数 `TABLE_NAME` の読み込み）
- [x] `app.py` を実装（Flask 初期化 / CORS 設定 / Blueprint 登録 / エラーハンドラー）

### 1-2. Books エンドポイント

- [x] `GET /api/v1/books` — scan + SK フィルタで書籍一覧を返す
- [x] `POST /api/v1/books` — バリデーション / UUID 生成 / put_item / 201 返却
- [x] `GET /api/v1/books/<book_id>` — get_item / 404 ハンドリング
- [x] `PUT /api/v1/books/<book_id>` — 存在確認 / update_item / 更新後オブジェクト返却
- [x] `DELETE /api/v1/books/<book_id>` — 存在確認 / delete_item

### 1-3. Reviews エンドポイント

- [x] `GET /api/v1/books/<book_id>/reviews` — 書籍存在確認 / query + begins_with
- [x] `POST /api/v1/books/<book_id>/reviews` — 書籍存在確認 / バリデーション / UUID 生成 / put_item / 201 返却

### 1-4. エラーハンドリング

- [x] 各エンドポイントに `abort(400)` バリデーションを追加
- [x] 各エンドポイントに `abort(404)` リソース確認を追加
- [x] boto3 呼び出しを `try-except (BotoCoreError, ClientError)` で囲む
- [x] `@app.errorhandler(404)` / `@app.errorhandler(500)` を実装

### 1-5. コンテナ化

- [x] `Dockerfile` を作成（`python:3.13-slim` ベース）
- [ ] ローカルで `docker build` → `docker run` で動作確認
- [ ] `curl` で全エンドポイントの動作確認

---

## 2. インフラ（講師側）

### 2-1. EC2 / Code Server

- [ ] EC2 インスタンス起動（Amazon Linux 2023 推奨）
- [ ] Code Server インストール・起動設定
- [ ] 学習者ごとのディレクトリ作成とスターターコード配置
- [ ] EC2 インスタンスロールに DynamoDB アクセス権限を付与（最小権限）

### 2-2. DynamoDB

- [ ] 学習者人数分のテーブルを作成（`book-review-api-<username>`）
 - PK: `PK`（String）/ SK: `SK`（String）
- [ ] テーブル作成スクリプトを用意（AWS CLI or CloudFormation）

### 2-3. ECR

- [ ] ECR リポジトリを作成（`book-review-api`）
- [ ] 学習者が使う `docker tag` / `docker push` コマンドを手順書に記載

### 2-4. ECS Fargate / ALB

- [ ] ECS クラスター作成
- [ ] タスク定義を作成（`python:3.13-slim` / 環境変数 `TABLE_NAME` を設定）
- [ ] ECS サービス作成（Fargate 起動タイプ）
- [ ] ALB 作成・ECS サービスとターゲットグループを紐付け
- [ ] 代表者イメージへのタスク定義更新手順を事前に確認・整備

### 2-5. Amplify

- [ ] Amplify アプリ作成
- [ ] 環境変数 `REACT_APP_API_BASE_URL` に ALB の DNS を設定
- [ ] React アプリをビルド・デプロイ
- [ ] カスタムドメインの設定（任意）

---

## 3. フロントエンド（React アプリ）

### 3-1. プロジェクト基盤

- [ ] `create-react-app` or Vite で React プロジェクトを作成
- [ ] `src/types.ts` に型定義を作成（`Book` / `BookInput` / `Review` / `ReviewInput`）
- [ ] `src/api.ts` に fetch ラッパーを実装（全 7 エンドポイント）
- [ ] React Router を導入（`/` と `/books/:id` のルーティング）

### 3-2. BooksPage（書籍一覧画面）

- [ ] `BooksPage` — `GET /books` で書籍一覧を取得・表示
- [ ] `BookList` — 書籍カードの一覧表示
- [ ] `BookCard` — 書籍タイトル・著者を表示、クリックで詳細画面へ遷移
- [ ] `BookForm` — タイトル・著者・紹介文の入力フォーム、`POST /books` を呼ぶ

### 3-3. BookDetailPage（書籍詳細画面）

- [ ] `BookDetailPage` — `GET /books/:id` と `GET /books/:id/reviews` を並列取得
- [ ] `BookDetail` — 書籍情報の表示・編集フォーム（`PUT`）・削除ボタン（`DELETE`）
- [ ] `ReviewList` — レビューカードの一覧表示
- [ ] `ReviewCard` — レビュアー名・評価・コメントを表示
- [ ] `ReviewForm` — レビュアー名・評価（1〜5）・コメントの入力フォーム、`POST /reviews` を呼ぶ

### 3-4. UX 仕上げ

- [ ] ローディング中のフィードバック表示（`loading` state）
- [ ] API エラー時のエラーメッセージ表示（`error` state）
- [ ] 書籍削除後に一覧画面へリダイレクト
- [ ] 最低限のスタイリング（CSS or Tailwind）

---

## 4. ドキュメント・配布物

- [x] `SPEC.md` — ハンズオン全体仕様
- [x] `api-spec.md` — API 仕様書（学習者配布用）
- [x] バックエンド骨格コード（`app.py` / `routes/books.py` / `routes/reviews.py` / `db/dynamo.py`）
- [x] `Dockerfile` 完成形（学習者配布用）
- [x] `requirements.txt` 完成形（学習者配布用）
- [ ] 手順書（学習者向け）— 環境確認 / 実装ステップ / ECR push / curl 動作確認コマンド集
- [ ] 講師用進行ガイド — タイムライン・詰まりポイントと対処法・Fargate デプロイ手順

---

## 依存関係サマリー

```
[1-1 基盤] → [1-2 Books] → [1-3 Reviews] → [1-4 エラーハンドリング] → [1-5 コンテナ化]
 ↓
[2-1 EC2] → [2-2 DynamoDB] [2-3 ECR push]
[2-4 Fargate/ALB] ←────────────────────────────────────────── [2-3 ECR]
 ↓
[3-1 基盤] → [3-2 BooksPage] → [3-3 BookDetailPage] → [3-4 UX] [2-5 Amplify]
 ↑
 バックエンドと並列で進められる（api.ts のモックで開発可能）
```
