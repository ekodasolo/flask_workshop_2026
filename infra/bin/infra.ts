#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { common } from '../lib/params';

const app = new cdk.App();

// env の解決優先順位: 1. CDK コンテキスト変数  2. 環境変数  3. params.ts のデフォルト値
const account = app.node.tryGetContext('account')
  ?? process.env.CDK_DEFAULT_ACCOUNT
  ?? common.account;
const region = app.node.tryGetContext('region')
  ?? process.env.CDK_DEFAULT_REGION
  ?? common.region;

new InfraStack(app, 'BookReviewWorkshopStack', {
  env: { account, region },
  environment: 'workshop',
  imageTag: 'latest',
});
