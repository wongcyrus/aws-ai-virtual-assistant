
import { CfnOutput, Duration } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from 'constructs';
import path = require("path");
import { Cors, LambdaIntegration, Period, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { RetentionDays } from "aws-cdk-lib/aws-logs";


export interface ChatApiStackProps {
  conversationBucket: Bucket;
}

export class ChatApiConstruct extends Construct {
  public readonly endpoint: string;
  public readonly unlimitedApiKey?: string;
  constructor(scope: Construct, id: string, props: ChatApiStackProps) {
    super(scope, id);

    const problemTopic = new Topic(this, 'problemTopic', {
      displayName: 'AI Virtual Assistant Problem Topic',
    });

    if (process.env.PROBLEM_EMAIL) {
      problemTopic.addSubscription(new EmailSubscription(process.env.PROBLEM_EMAIL));
    }

    const bedrockFunction = new NodejsFunction(this, "bedrockFunction", {
      description: "Bedrock Lambda Function",
      entry: path.join(__dirname, "/../../src/lambda/bedrock/index.js"),
      handler: "handler",
      timeout: Duration.seconds(30),
      environment: {
        maxTokens: process.env.MAX_TOKENS!,
        conversationBucket: props.conversationBucket.bucketName,
        problemTopicArn: problemTopic.topicArn,
      },
      depsLockFilePath: path.join(__dirname, "/../../src/lambda/bedrock/package-lock.json"),
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime          
        ]
      },
      logRetention: RetentionDays.ONE_MONTH,
    });
    bedrockFunction.role!.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('ComprehendReadOnly'));
    bedrockFunction.role?.addToPrincipalPolicy(new PolicyStatement({
      resources: ["*"],
      actions: ['bedrock:InvokeModel'],
    }));
    props.conversationBucket.grantWrite(bedrockFunction);
    problemTopic.grantPublish(bedrockFunction);

    const sessionTokenFunction = new NodejsFunction(this, "sessionTokenFunction", {
      description: "Session Token Lambda Function",
      entry: path.join(__dirname, "/../../src/lambda/session-token/index.js"),
      handler: "handler",
      timeout: Duration.seconds(90),
      depsLockFilePath: path.join(__dirname, "/../../src/lambda/session-token/package-lock.json"),
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime          
        ]
      },
      logRetention: RetentionDays.ONE_MONTH,
    });

    const aiRole = new Role(this, 'aiRole', {
      assumedBy: sessionTokenFunction.grantPrincipal,
      description: 'An IAM role for Amazon Polly',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonPollyReadOnlyAccess',
        )
      ],
      inlinePolicies: {
        "transcribe": new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: ['*'],
              actions: ['transcribe:StartStreamTranscriptionWebSocket'],
              effect: Effect.ALLOW,
            }),
          ],
        })
      }

    });

    sessionTokenFunction.role!.addToPrincipalPolicy(
      new PolicyStatement({
        resources: [aiRole.roleArn],
        actions: ['sts:AssumeRole'],
      })
    );

    sessionTokenFunction.addEnvironment("aiRole", aiRole.roleArn);

    const aiVirtualAssistantApi = new RestApi(this, 'aiVirtualAssistantApi',
      {
        defaultCorsPreflightOptions: {
          allowOrigins: Cors.ALL_ORIGINS,
        },
      });

    const bedrockLambdaIntegration = new LambdaIntegration(bedrockFunction);
    const sessionTokenLambdaIntegration = new LambdaIntegration(sessionTokenFunction);

    const v1 = aiVirtualAssistantApi.root.addResource('v1');
    v1.addResource('session-token').addMethod('GET', sessionTokenLambdaIntegration, { apiKeyRequired: true });
    const bedrockResource = v1.addResource('bedrock');
    bedrockResource.addMethod('POST', bedrockLambdaIntegration, { apiKeyRequired: true });

    const prod = aiVirtualAssistantApi.deploymentStage;
    this.endpoint = aiVirtualAssistantApi.url + "v1/";

    const plan = aiVirtualAssistantApi.addUsagePlan('UsagePlan', {
      name: 'AiVirtualAssistant',
      description: 'AiVirtualAssistant',
      throttle: {
        rateLimit: 10,
        burstLimit: 2
      },
      quota: {
        limit: +process.env.QUOTA!,
        period: Period.DAY
      },
      apiStages: [{ api: aiVirtualAssistantApi, stage: prod }]
    });

    if (process.env.UNLIMIT_KEY) {
      const unlimitedPlan = aiVirtualAssistantApi.addUsagePlan('unlimitedUsagePlan', {
        name: 'AiVirtualAssistantUnlimited',
        description: 'AiVirtualAssistant',
        throttle: {
          rateLimit: 10,
          burstLimit: 2
        },
        apiStages: [{ api: aiVirtualAssistantApi, stage: prod }]
      });

      const apiKeyValue = process.env.UNLIMIT_KEY!;
      const demoUserKey = prod.addApiKey('unlimitedApiKey', {
        apiKeyName: 'AiVirtualAssistantUnlimited',
        value: apiKeyValue,
      });
      unlimitedPlan.addApiKey(demoUserKey);
      new CfnOutput(this, 'UnlimitedUserApiKey', {
        value: apiKeyValue,
        description: 'Unlimit User ApiKey',
      });

      this.unlimitedApiKey = apiKeyValue;
    }


    new CfnOutput(this, 'usagePlanId', {
      value: plan.usagePlanId!,
      description: 'Usage plan ID',
    });

    new CfnOutput(this, 'HttpEndpoint', {
      value: aiVirtualAssistantApi.url!,
      description: 'Http Api',
    });
  }
}