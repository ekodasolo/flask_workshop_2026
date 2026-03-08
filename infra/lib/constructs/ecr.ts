import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { ecr as params } from '../params';

export interface EcrProps {
  // ECR リポジトリの設定をここに追加する
}

/**
 * ECR リポジトリを定義するコンストラクト
 * - book-review-api リポジトリ
 */
export class Ecr extends Construct {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props?: EcrProps) {
    super(scope, id);

    // TODO: ECR リポジトリを作成する
    // params.repositoryName を使用する
  }
}
