import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Network } from './constructs/network';
import { Database } from './constructs/database';
import { Ecr } from './constructs/ecr';
import { Application } from './constructs/application';

export interface InfraStackProps extends cdk.StackProps {
  environment: string;
  username: string;
  imageTag: string;
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { environment, username, imageTag } = props;

    // ネットワーク
    const network = new Network(this, 'Network', {
      environment: environment
    });

    // DynamoDB テーブル
    const database = new Database(this, 'Database', {
      environment: environment,
      username: username,
    });

    // ECR リポジトリ
    const ecr = new Ecr(this, 'Ecr', {
      environment: environment,
    });

    // ALB + Fargate
    const application = new Application(this, 'Application', {
      environment: environment,
      vpc: network.vpc,
      repository: ecr.repository,
      imageTag: imageTag,
      table: database.table,
    });

    //-------------------------------------------------------
    // Stack Outputs
    //-------------------------------------------------------
    // VPC
    new cdk.CfnOutput(this, 'VpcId', {
      value: network.vpc.vpcId,
      description: 'VPC ID',
    });

    // ALB Arn
    new cdk.CfnOutput(this, 'AlbArn', {
      value: application.alb.loadBalancerArn,
      description: 'ALB ARN',
    });

    // ALB の DNS名
    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: application.alb.loadBalancerDnsName,
      description: 'ALB DNS Name',
    });

    // ECS Cluster
    new cdk.CfnOutput(this, 'ECSClusterName', {
      value: application.ecsCluster.clusterName,
      description: 'ECS Cluster Name',
    });

    // ECS Service
    new cdk.CfnOutput(this, 'ECSServiceName', {
      value: application.ecsService.serviceName,
      description: 'ECS Service Name',
    });

  }
}
