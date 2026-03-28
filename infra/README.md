# インフラ（AWS CDK）

書籍レビュー API ハンズオンのインフラを AWS CDK（TypeScript）で定義しています。

## スタック構成

CDK App は **2つのスタック** で構成されています。

| スタック | 含むリソース | 用途 |
|---|---|---|
| **BaseStack** | ECR リポジトリ / DynamoDB テーブル | イメージ push 先とデータストア |
| **AppStack** | VPC / ALB / Fargate（ECS） | アプリケーション実行環境 |

BaseStack を先にデプロイし、ECR にイメージを push した後に AppStack をデプロイします。

```
BaseStack                AppStack
┌─────────────────┐      ┌─────────────────────────┐
│ ECR Repository   │◄─────│ Fargate (ECS Service)   │
│ DynamoDB Table   │◄─────│ ALB                     │
└─────────────────┘      │ VPC (Public + Private)  │
                         └─────────────────────────┘
```

## コンストラクト構成

```
infra/lib/
├── base-stack.ts            # BaseStack（ECR + DynamoDB）
├── app-stack.ts             # AppStack（VPC + ALB + Fargate）
├── params.ts                # パラメータ定義
└── constructs/
    ├── ecr.ts               # ECR リポジトリ
    ├── database.ts          # DynamoDB テーブル
    ├── network.ts           # VPC / サブネット
    └── application.ts       # ALB / ECS Cluster / Fargate Service
```

## 前提条件

- Node.js 22.x
- AWS CLI v2（認証情報設定済み）
- AWS CDK CLI（`npm install -g aws-cdk` または `npx cdk`）

## セットアップ

```bash
cd infra
npm install
```

## パラメータ設定

デプロイ前に `lib/params.ts` を編集してください。

| パラメータ | 説明 | 例 |
|---|---|---|
| `common.account` | AWS アカウント ID | `'123456789012'` |
| `common.region` | デプロイ先リージョン | `'ap-northeast-1'` |
| `common.username` | デフォルトのユーザー名 | `'fuji'` |
| `application.alb.certificationArn` | ALB に設定する ACM 証明書の ARN | `'arn:aws:acm:...'` |
| `application.securityGroup.albAllowedSourceCidrs` | ALB へのアクセスを許可する CIDR | `['0.0.0.0/0']` |

## コンテキスト変数

デプロイ時にコンテキスト変数でパラメータを上書きできます。

| 変数名 | 説明 | デフォルト値 |
|---|---|---|
| `username` | ユーザー名（リソース名に使用） | `params.ts` の `common.username` |
| `vpccidr` | VPC の CIDR ブロック | `params.ts` の `network.vpcCidr` |
| `account` | AWS アカウント ID | `params.ts` の `common.account` |
| `region` | デプロイ先リージョン | `params.ts` の `common.region` |

解決優先順位: **CDK コンテキスト変数 > 環境変数 > params.ts のデフォルト値**

## デプロイ手順

### 初回デプロイ（3ステップ）

```bash
# 1. BaseStack をデプロイ（ECR + DynamoDB を作成）
npm run deploy:base:fuji

# 2. ECR にイメージを push
#    デプロイ出力の EcrRepositoryUri を使用
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com
docker build -t <repository-uri>:latest ../answer/app/
docker push <repository-uri>:latest

# 3. AppStack をデプロイ（VPC + ALB + Fargate を作成）
npm run deploy:app:fuji
```

### 全スタック一括デプロイ（2回目以降）

```bash
npm run deploy:all:fuji
```

### npm scripts 一覧

| コマンド | 内容 |
|---|---|
| `npm run deploy:base:<user>` | BaseStack のみデプロイ |
| `npm run deploy:app:<user>` | AppStack のみデプロイ |
| `npm run deploy:all:<user>` | 全スタックデプロイ |
| `npm run destroy:<user>` | 全スタック削除（AppStack → BaseStack の順） |

現在定義済みのユーザー: `fuji`, `user1`, `user2`

### スクリプトを使わずにデプロイする場合

```bash
npx cdk deploy BookReviewBase-tanaka -c username=tanaka -c vpccidr=10.3.0.0/16
npx cdk deploy BookReviewApp-tanaka -c username=tanaka -c vpccidr=10.3.0.0/16
```

## リソース命名規則

リソース名は `{project}-{environment}-{username}-{リソース種別}` の形式です。

例（`username=fuji` の場合）：

| リソース | 名前 |
|---|---|
| DynamoDB テーブル | `book-review-api-workshop-fuji-table` |
| ECR リポジトリ | `book-review-api-workshop-fuji-repo` |
| ECS クラスター | `book-review-api-workshop-fuji-cluster` |
| VPC Name タグ | `book-review-api-workshop-fuji-vpc` |

## 削除

```bash
# 全リソースを削除（AppStack → BaseStack の順で自動的に削除される）
npm run destroy:fuji
```

**注意**: AppStack が BaseStack のリソースを参照しているため、BaseStack だけを先に削除することはできません。
