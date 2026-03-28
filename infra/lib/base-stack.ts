import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Database } from './constructs/database';
import { Ecr } from './constructs/ecr';
import * as ecr_lib from 'aws-cdk-lib/aws-ecr';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface BaseStackProps extends cdk.StackProps {
  environment: string;
  username: string;
}

/**
 * ベーススタック
 * - ECR リポジトリ（イメージ push 先）
 * - DynamoDB テーブル
 *
 * AppStack より先にデプロイする
 */
export class BaseStack extends cdk.Stack {
  public readonly repository: ecr_lib.Repository;
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const { environment, username } = props;

    // ECR リポジトリ
    const ecrConstruct = new Ecr(this, 'Ecr', { environment, username });
    this.repository = ecrConstruct.repository;

    // DynamoDB テーブル
    const database = new Database(this, 'Database', { environment, username });
    this.table = database.table;

    //-------------------------------------------------------
    // Stack Outputs
    //-------------------------------------------------------
    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: this.repository.repositoryUri,
      description: 'ECR Repository URI',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: this.table.tableName,
      description: 'DynamoDB Table Name',
    });
  }
}
