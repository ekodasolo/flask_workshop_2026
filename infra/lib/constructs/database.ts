import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import { common, database as params } from '../params';

export interface DatabaseProps {
  environment: string;
}

/**
 * DynamoDB テーブルを定義するコンストラクト
 * - PK: PK (String) / SK: SK (String)
 */
export class Database extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    const { environment } = props;

    this.table = new dynamodb.Table(this, 'DDBTable', {
      tableName: `${params.tableNamePrefix}-${environment}`,
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