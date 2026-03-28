#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BaseStack } from '../lib/base-stack';
import { AppStack } from '../lib/app-stack';
import { common, network } from '../lib/params';

const app = new cdk.App();

// env の解決優先順位: 1. CDK コンテキスト変数  2. 環境変数  3. params.ts のデフォルト値
const account = app.node.tryGetContext('account')
  ?? process.env.CDK_DEFAULT_ACCOUNT
  ?? common.account;
const region = app.node.tryGetContext('region')
  ?? process.env.CDK_DEFAULT_REGION
  ?? common.region;
const username = app.node.tryGetContext('username')
  ?? process.env.CDK_USERNAME
  ?? common.username;
const vpcCidr = app.node.tryGetContext('vpccidr')
  ?? process.env.CDK_VPC_CIDR
  ?? network.vpcCidr;

const env = { account, region };

// BaseStack: ECR + DynamoDB（先にデプロイ）
const baseStack = new BaseStack(app, `BookReviewBase-${username}`, {
  env,
  environment: 'workshop',
  username,
});

// AppStack: VPC + ALB + Fargate（イメージ push 後にデプロイ）
const appStack = new AppStack(app, `BookReviewApp-${username}`, {
  env,
  environment: 'workshop',
  username,
  vpcCidr,
  imageTag: 'latest',
  repository: baseStack.repository,
  table: baseStack.table,
});

appStack.addDependency(baseStack);
