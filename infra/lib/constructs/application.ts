import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { application as params } from '../params';

export interface ApplicationProps {
  /** Network コンストラクトで作成した VPC */
  vpc: ec2.Vpc;
  /** ECR コンストラクトで作成したリポジトリ */
  repository: ecr.Repository;
  /** Fargate タスクに渡す TABLE_NAME 環境変数 */
  tableName: string;
}

/**
 * アプリケーション構成を定義するコンストラクト
 * - ECS クラスター
 * - Fargate タスク定義・サービス
 * - ALB
 */
export class Application extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly albDnsName: string;

  constructor(scope: Construct, id: string, props: ApplicationProps) {
    super(scope, id);

    // TODO: ECS クラスターを作成する
    // TODO: Fargate タスク定義を作成する
    //   - props.tableName を環境変数 TABLE_NAME に設定
    //   - params.containerPort を使用
    // TODO: Fargate サービスを作成する
    // TODO: ALB を作成してサービスと紐付ける
  }
}
