import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { network as params } from '../params';

export interface NetworkProps {
  // VPC の設定をここに追加する
}

/**
 * ネットワーク構成を定義するコンストラクト
 * - VPC（パブリック / プライベートサブネット）
 */
export class Network extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: NetworkProps) {
    super(scope, id);

    // TODO: VPC を定義する
    // params.maxAzs を使用する
  }
}
