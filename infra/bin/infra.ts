#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();

// cdk.json の context または環境変数から学習者リストを取得する
const usernames = app.node.tryGetContext('usernames') as string[] ?? ['user1', 'user2'];
const tableName = app.node.tryGetContext('tableName') as string ?? `book-review-api-${usernames[0]}`;

new InfraStack(app, 'BookReviewWorkshopStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  usernames,
  tableName,
});
