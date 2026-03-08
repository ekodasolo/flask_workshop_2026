import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Network } from './constructs/network';
import { Database } from './constructs/database';
import { Ecr } from './constructs/ecr';
import { Application } from './constructs/application';

export interface InfraStackProps extends cdk.StackProps {
  /** 学習者のユーザー名リスト */
  usernames: string[];
  /** 代表者のテーブル名（Fargate の環境変数に設定する） */
  tableName: string;
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    // ネットワーク
    const network = new Network(this, 'Network');

    // DynamoDB テーブル（学習者ごと）
    const database = new Database(this, 'Database', {
      usernames: props.usernames,
    });

    // ECR リポジトリ
    const ecr = new Ecr(this, 'Ecr');

    // ALB + Fargate
    const application = new Application(this, 'Application', {
      vpc: network.vpc,
      repository: ecr.repository,
      tableName: props.tableName,
    });

    // ALB の DNS 名を出力する
    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: application.albDnsName,
      description: 'ALB の DNS 名（React アプリの API_BASE_URL に設定する）',
    });
  }
}
