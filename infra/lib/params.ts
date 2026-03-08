// ============================================================
// ワークショップ環境のパラメータ定義
// デプロイ前にここを編集する
// ============================================================

/** 共通パラメータ */
export const common = {
  /** プロジェクト名（リソース名のプレフィックスに使用） */
  projectName: 'book-review-api',
  /** デプロイ先リージョン */
  region: 'ap-northeast-1',
  /** 学習者のユーザー名リスト */
  usernames: ['user1', 'user2'],
};

/** Network コンストラクト */
export const network = {
  /** VPC の最大 AZ 数 */
  maxAzs: 2,
};

/** Database コンストラクト */
export const database = {
  /** テーブル名のプレフィックス（テーブル名: <prefix>-<username>） */
  tableNamePrefix: common.projectName,
};

/** ECR コンストラクト */
export const ecr = {
  /** リポジトリ名 */
  repositoryName: common.projectName,
};

/** Application コンストラクト */
export const application = {
  /** Fargate にデプロイする代表者のユーザー名 */
  deployUsername: common.usernames[0],
  /** コンテナのポート */
  containerPort: 5000,
  /** Fargate タスクに渡す TABLE_NAME（代表者のテーブル名） */
  get tableName() {
    return `${database.tableNamePrefix}-${this.deployUsername}`;
  },
};
