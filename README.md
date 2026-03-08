# Flask + DynamoDB ハンズオン — Book Review API

社内メンバー向けの半日（3.5 時間）ハンズオンコンテンツです。
Flask で REST API を実装し、DynamoDB にデータを保存、Docker コンテナにして AWS (ECS Fargate) にデプロイするまでを体験します。

## 作るもの

書籍とレビューを管理する REST API（Book Review API）。

- 書籍の CRUD（一覧・登録・詳細・更新・削除）
- レビューの投稿・一覧取得
- DynamoDB シングルテーブル設計（PK/SK パターン）

## 対象者

- Python の基本文法を理解している
- Web の基礎（HTTP、JSON、REST）を知っている
- AWS を使ったことがある（コンソール操作程度で OK）

## ディレクトリ構成

```
flask_workshop/
├── starter/             学習者に配布する骨格コード（TODO コメント付き）
│   └── app/
├── answer/              完成形コード（講師用）
│   └── app/
├── frontend/            デモ用 React フロントエンド
├── infra/               AWS CDK（TypeScript）によるインフラ定義
├── docs/                手順書・講師ガイド
│   ├── handout.md         学習者向け手順書
│   ├── api-spec.md        API 仕様書
│   └── instructor-guide.md  講師用進行ガイド
├── SPEC.md              ハンズオン全体仕様
├── TODOS.md             タスク管理
├── CLAUDE.md            プロジェクト規約
├── ISSUES.md            エラー・トラブル記録
└── KNOWLEDGE.md         ナレッジ・TIPS 集
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| バックエンド | Python 3.13 / Flask 3.1 / boto3 |
| データベース | Amazon DynamoDB |
| コンテナ | Docker / Amazon ECS Fargate |
| フロントエンド | React 19 / TypeScript / Vite |
| ホスティング | AWS Amplify |
| インフラ管理 | AWS CDK（TypeScript） |

## ハンズオンの流れ

1. **API 実装**（約 2 時間）— Flask で 7 つのエンドポイントを実装
2. **コンテナ化**（約 30 分）— Dockerfile でビルド、ECR にプッシュ
3. **デプロイ**（約 30 分）— 講師が ECS Fargate にデプロイ、フロントエンドと接続
4. **動作確認**（約 30 分）— ブラウザから自分の API を操作

## 学習者向けドキュメント

- `docs/handout.md` — ステップバイステップの実装手順書
- `docs/api-spec.md` — API エンドポイントの仕様

## 講師向けドキュメント

- `docs/instructor-guide.md` — タイムライン・詰まりポイントと対処法
- `SPEC.md` — ハンズオン全体の設計仕様

## フロントエンドの起動

```bash
cd frontend
npm install
npm run dev
```

API URL 未設定時はモックモードで動作します。詳細は `frontend/README.md` を参照。
