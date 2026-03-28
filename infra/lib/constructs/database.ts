import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import { common, database as params } from '../params';

export interface DatabaseProps {
  environment: string;
  username: string;
}

/**
 * DynamoDB テーブルを定義するコンストラクト
 * - 学習者ごとに book-review-api-<username> テーブルを作成
 * - PK: PK (String) / SK: SK (String)
 */
export class Database extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    const { environment, username } = props;

    this.table = new dynamodb.Table(this, `DDBTable-${environment}-${username}`, {
      tableName: `${params.tableNamePrefix}-${environment}-${username}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  };
}