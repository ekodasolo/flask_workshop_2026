// ============================================================
// ワークショップ環境のパラメータ定義
// デプロイ前にここを編集する
// ============================================================

/** プロジェクト名（リソース名のプレフィックスに使用） */
export const PROJECT_NAME = 'book-review-api';

/** デプロイ先リージョン */
export const REGION = 'ap-northeast-1';

/** 学習者のユーザー名リスト（DynamoDB テーブルを人数分作成する） */
export const USERNAMES = [
  'user1',
  'user2',
];

/** Fargate にデプロイする代表者のユーザー名 */
export const DEPLOY_USERNAME = USERNAMES[0];

/** DynamoDB テーブル名のプレフィックス（テーブル名: <PREFIX>-<username>） */
export const TABLE_NAME_PREFIX = PROJECT_NAME;

/** ECR リポジトリ名 */
export const ECR_REPOSITORY_NAME = PROJECT_NAME;

/** Fargate コンテナのポート */
export const CONTAINER_PORT = 5000;
