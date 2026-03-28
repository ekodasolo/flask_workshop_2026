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
const usernames: string[] = app.node.tryGetContext('usernames')
  ?? process.env.WORKSHOP_USERNAMES?.split(',')
  ?? common.usernames;

// 参加者ごとに独立したスタックをデプロイする
for (const username of usernames) {
  new InfraStack(app, `BookReviewWorkshop-${username}`, {
    env: { account, region },
    environment: 'workshop',
    username,
    imageTag: 'latest',
  });
}
