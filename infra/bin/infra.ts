#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { common, application } from '../lib/params';

const app = new cdk.App();

// env の解決優先順位: 1. CDK コンテキスト変数  2. 環境変数  3. params.ts のデフォルト値
const account = app.node.tryGetContext('account')
  ?? process.env.CDK_DEFAULT_ACCOUNT;
const region = app.node.tryGetContext('region')
  ?? process.env.CDK_DEFAULT_REGION
  ?? common.region;
const usernames = app.node.tryGetContext('usernames')
  ?? process.env.WORKSHOP_USERNAMES?.split(',')
  ?? common.usernames;
const tableName = app.node.tryGetContext('tableName')
  ?? process.env.WORKSHOP_TABLE_NAME
  ?? application.tableName;

new InfraStack(app, 'BookReviewWorkshopStack', {
  env: { account, region },
  usernames,
  tableName,
});
