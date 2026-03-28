#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
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


new InfraStack(app, 'BookReviewWorkshopStack', {
  env: { account, region },
  environment: 'workshop',
  vpcCidr: vpcCidr,
  imageTag: 'latest',
  username: username
});
