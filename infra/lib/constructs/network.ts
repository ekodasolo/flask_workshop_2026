import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { common, network as params } from '../params';

export interface NetworkProps {
  environment: string,
  username: string,
}

/**
 * ネットワーク構成を定義するコンストラクト
 * - VPC（パブリック / プライベートサブネット）
 */
export class Network extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: NetworkProps) {
    super(scope, id);

    const { environment, username } = props;

    // VPC
    this.vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr(params.vpcCidr),
      availabilityZones: [...params.availabilityZones],
      subnetConfiguration: [
        {
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: params.subnetCidrMask,
        },
        {
          name: 'PrivateSubnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: params.subnetCidrMask,
        }
      ],
      natGateways: params.natGatewayCount
    });

    // Tag
    cdk.Tags.of(this.vpc).add('Name', `${common.projectName}-${environment}-${username}-vpc`)
  }
}
