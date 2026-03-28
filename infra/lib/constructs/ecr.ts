import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as cdk from 'aws-cdk-lib';
import { common, ecr as params } from '../params';

export interface EcrProps {
  environment: string
}

/**
 * ECR リポジトリを定義するコンストラクト
 * - book-review-api リポジトリ
 */
export class Ecr extends Construct {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrProps) {
    super(scope, id);

    const { environment } = props;

    this.repository = new ecr.Repository(this, 'EcrRepo', {
      repositoryName: `${params.repositoryName}-${environment}-repo`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });
  }
}
