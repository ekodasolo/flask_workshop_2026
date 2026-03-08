#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { common, application } from '../lib/params';

const app = new cdk.App();

new InfraStack(app, 'BookReviewWorkshopStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: common.region,
  },
  usernames: common.usernames,
  tableName: application.tableName,
});
