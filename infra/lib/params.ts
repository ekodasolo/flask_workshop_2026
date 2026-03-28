// ============================================================
// ワークショップ環境のパラメータ定義
// デプロイ前にここを編集する
// ============================================================

/** 共通パラメータ */
export const common = {
  projectName: 'book-review-api',
  account: '123456789012',
  region: 'ap-northeast-1',
  usernames: ['user1', 'user2'],
};

/** Network コンストラクト */
export const network = {
  maxAzs: 2,
  vpcCidr: '10.0.0.0/16',
  availabilityZones: ['ap-northeast-1a', 'ap-northeast-1c'],
  natGatewayCount: 1,
  subnetCidrMask: 24
};

/** Database コンストラクト */
export const database = {
  tableNamePrefix: common.projectName,
};

/** ECR コンストラクト */
export const ecr = {
  repositoryName: common.projectName,
};

/** Application コンストラクト */
export const application = {
  // セキュリティグループ設定
  securityGroup: {
    albIngressPort: 443,
    albAllowedSourceCidrs: ["210.175.11.128/26", "210.149.174.146/32", "210.149.174.147/32", "52.194.17.175/32"],
    ecsIngressPort: 5000,
  },
  // ALB設定
  alb: {
    port: 443,
    healthCheck: {
      path: '/',
      intervalSeconds: 30,
      timeoutSeconds: 5,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
    },
    customDomainName: '', 
    certificationArn: '',
  },
  // ECS設定
  ecs: {
    task: {
      cpu: 256, // 0.25 vCPU
      memory: 512, // 512 MB
    },
    container: {
      name: 'flask',
      containerPort: 5000,
    },
    service: {
      desiredCount: 1,
    },
  },
  // CloudWatch Logs設定
  logs: {
    streamPrefix: 'ecs',
  },
};
