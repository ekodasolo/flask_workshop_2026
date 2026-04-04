import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { common, application as params } from '../params';

export interface ApplicationProps {
  environment: string;
  username: string;
  vpc: ec2.Vpc;
  repository: ecr.Repository;
  imageTag: string;
  table: ddb.Table;
}

/**
 * アプリケーション構成を定義するコンストラクト
 * - ECS クラスター
 * - Fargate タスク定義・サービス
 * - ALB
 */
export class Application extends Construct {
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecsService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ApplicationProps) {
    super(scope, id);

    // Constructor props
    const { environment, username, vpc, repository, imageTag, table } = props;

    // Security Group for ALB
    const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: false
    });

    const allowed_cidrs = params.securityGroup.albAllowedSourceCidrs;
    allowed_cidrs.forEach(cidr => {
      albSecurityGroup.addIngressRule(
        ec2.Peer.ipv4(cidr),
        ec2.Port.tcp(params.securityGroup.albIngressPort),
        'Allow HTTP traffic from internet'
      );
    });

    // Security Group for ECS
    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc,
      description: 'Security group for ECS tasks',
    });

    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(params.securityGroup.ecsIngressPort),
      'Allow traffic from ALB'
    );
    ecsSecurityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTcp());

    // ALB
    const albForApp = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });
    this.alb = albForApp;

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc,
      clusterName: `${common.projectName}-${environment}-${username}-cluster`,
    });
    this.ecsCluster = cluster;

    // Logs
    const logGroup = new logs.LogGroup(this, 'EcsLogGroup', {
      logGroupName: `/ecs/${common.projectName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ECS execution Role
    const executionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy'
        ),
      ],
    });

    // ECS task Role
    const serviceTaskRole = new iam.Role(this, 'EcsTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'CloudWatchLogsFullAccess'
        ),
      ],
    });
    table.grantReadWriteData(serviceTaskRole);

    // ECS Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      cpu: params.ecs.task.cpu,
      memoryLimitMiB: params.ecs.task.memory,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
      executionRole: executionRole,
      taskRole: serviceTaskRole,
    });

    const containerDefinition = taskDefinition.addContainer(params.ecs.container.name, {
      image: ecs.ContainerImage.fromEcrRepository(
        repository,
        imageTag ?? 'latest',
      ),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: params.logs.streamPrefix,
        logGroup: logGroup,
      }),
      environment: {
        TABLE_NAME: table.tableName,
        AWS_DEFAULT_REGION: common.region
      },
    });
    containerDefinition.addPortMappings({
      containerPort: params.ecs.container.containerPort,
      protocol: ecs.Protocol.TCP,
    });

    // ECS Service
    const ecsService = new ecs.FargateService(this, 'EcsService', {
      cluster,
      taskDefinition,
      desiredCount: params.ecs.service.desiredCount,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: vpc.selectSubnets({ subnetGroupName: 'PrivateSubnet' }),
      serviceName: `${common.projectName}-${environment}-ecs-service`,
    });
    this.ecsService = ecsService;

    // Target Group
    const appTargetGroup = new elbv2.ApplicationTargetGroup(this, 'AppTargetGroup', {
      vpc,
      port: params.ecs.container.containerPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [ecsService],
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
      },
    });

    // ALB Listener
    const albListener = albForApp.addListener('AlbListener', {
      port: params.alb.port,
      // certificates: [
      //     {
      //       certificateArn: params.alb.certificationArn || '',
      //     },
      // ],
      defaultTargetGroups: [appTargetGroup],
      open: false,
    });
  }
}
