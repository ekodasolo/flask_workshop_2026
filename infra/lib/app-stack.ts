import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Network } from './constructs/network';
import { Application } from './constructs/application';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface AppStackProps extends cdk.StackProps {
  environment: string;
  username: string;
  vpcCidr: string;
  imageTag: string;
  repository: ecr.Repository;
  table: dynamodb.Table;
}

/**
 * アプリケーションスタック
 * - VPC
 * - ALB + Fargate
 *
 * BaseStack でイメージ push 後にデプロイする
 */
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const { environment, username, vpcCidr, imageTag, repository, table } = props;

    // ネットワーク
    const network = new Network(this, 'Network', {
      environment,
      username,
      vpcCidr,
    });

    // ALB + Fargate
    const application = new Application(this, 'Application', {
      environment,
      username,
      vpc: network.vpc,
      repository,
      imageTag,
      table,
    });

    //-------------------------------------------------------
    // Stack Outputs
    //-------------------------------------------------------
    new cdk.CfnOutput(this, 'VpcId', {
      value: network.vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'AlbArn', {
      value: application.alb.loadBalancerArn,
      description: 'ALB ARN',
    });

    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: application.alb.loadBalancerDnsName,
      description: 'ALB DNS Name',
    });

    new cdk.CfnOutput(this, 'ECSClusterName', {
      value: application.ecsCluster.clusterName,
      description: 'ECS Cluster Name',
    });

    new cdk.CfnOutput(this, 'ECSServiceName', {
      value: application.ecsService.serviceName,
      description: 'ECS Service Name',
    });
  }
}
