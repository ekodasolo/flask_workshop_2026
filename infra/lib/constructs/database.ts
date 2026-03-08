import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface DatabaseProps {
  /** 学習者のユーザー名リスト（テーブルを人数分作成する） */
  usernames: string[];
}

/**
 * DynamoDB テーブルを定義するコンストラクト
 * - 学習者ごとに book-review-api-<username> テーブルを作成
 * - PK: PK (String) / SK: SK (String)
 */
export class Database extends Construct {
  public readonly tables: dynamodb.Table[];

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    // TODO: 学習者人数分の DynamoDB テーブルを作成する
    this.tables = [];
  }
}
