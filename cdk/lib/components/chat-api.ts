


import { CfnOutput, Duration } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from 'constructs';
import path = require("path");
import { Cors, LambdaIntegration, Period, RestApi } from "aws-cdk-lib/aws-apigateway";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { Runtime } from "@aws-cdk/aws-lambda";
import { HuggingFaceSagemakerServerlessInferenceConstruct } from "./hugging-face-sagemaker-serverless-inference";
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

    const openAiFunction = new NodejsFunction(this, "openAiFunction", {
      description: "OpenAI Lambda Function",
      entry: path.join(__dirname, "/../../src/lambda/open-ai/index.js"),
      handler: "handler",
      timeout: Duration.seconds(30),
      environment: {
        basePath: process.env.OPENAI_BASE_PATH!,
        apikey: process.env.OPENAI_APIKEY!,
        maxTokens: process.env.MAX_TOKENS!,
        conversationBucket: props.conversationBucket.bucketName,
        problemTopicArn: problemTopic.topicArn,
      },
      depsLockFilePath: path.join(__dirname, "/../../src/lambda/open-ai/package-lock.json"),
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime          
        ]
      },
      logRetention: RetentionDays.ONE_MONTH,
    });
    openAiFunction.role!.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('ComprehendReadOnly'));
    props.conversationBucket.grantWrite(openAiFunction);
    problemTopic.grantPublish(openAiFunction);


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


    const hfConstruct = new HuggingFaceSagemakerServerlessInferenceConstruct(
      this,
      "huggingFaceSagemakerServerlessInferenceConstruct",
      {
        hfModelId: "facebook/blenderbot-400M-distill",
        hfTask: "conversational",
        memorySizeInMb: 3072,
      }
    );
    const huggingFaceFunction = new PythonFunction(this, 'huggingFaceFunction', {
      description: "Hugging Face Lambda Function",
      entry: path.join(__dirname, "/../../src/lambda/huggingface"),
      runtime: Runtime.PYTHON_3_9, // required
      memorySize: 512,
      timeout: Duration.seconds(60),
      environment: {
        huggingFaceodelEndpointName: hfConstruct.endpointName,
        conversationBucket: props.conversationBucket.bucketName,
        problemTopicArn: problemTopic.topicArn,
      },
      initialPolicy: [hfConstruct.invokeEndPointPolicyStatement],
      logRetention: RetentionDays.ONE_MONTH,
    });
    huggingFaceFunction.role!.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('ComprehendReadOnly'));
    props.conversationBucket.grantWrite(huggingFaceFunction);
    problemTopic.grantPublish(huggingFaceFunction);


    const aiRole = new Role(this, 'pollyRole', {
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

    sessionTokenFunction.addEnvironment("pollyRole", aiRole.roleArn);

    const aiVirtualAssistantApi = new RestApi(this, 'aiVirtualAssistantApi',
      {
        defaultCorsPreflightOptions: {
          allowOrigins: Cors.ALL_ORIGINS,
        },
      });

    const openAiLambdaIntegration = new LambdaIntegration(openAiFunction);
    const sessionTokenLambdaIntegration = new LambdaIntegration(sessionTokenFunction);
    const huggingFaceLambdaIntegration = new LambdaIntegration(huggingFaceFunction);

    const v1 = aiVirtualAssistantApi.root.addResource('v1');
    v1.addResource('session-token').addMethod('GET', sessionTokenLambdaIntegration, { apiKeyRequired: true });
    const azureResource = v1.addResource('open-ai');
    azureResource.addMethod('POST', openAiLambdaIntegration, { apiKeyRequired: true });
    const huggingFaceResource = v1.addResource('huggingFace');
    huggingFaceResource.addMethod('POST', huggingFaceLambdaIntegration, { apiKeyRequired: true });

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