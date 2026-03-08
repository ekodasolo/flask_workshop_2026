#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { REGION, USERNAMES, DEPLOY_USERNAME, TABLE_NAME_PREFIX } from '../lib/const';

const app = new cdk.App();

new InfraStack(app, 'BookReviewWorkshopStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: REGION,
  },
  usernames: USERNAMES,
  tableName: `${TABLE_NAME_PREFIX}-${DEPLOY_USERNAME}`,
});
