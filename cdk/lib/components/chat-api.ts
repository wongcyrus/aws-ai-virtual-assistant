


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


export interface ChatApiStackProps {
  conversationBucket: Bucket;
}

export class ChatApiConstruct extends Construct {
  public readonly endpoint: string;
  public readonly unlimitedApiKey?: string;
  constructor(scope: Construct, id: string, props: ChatApiStackProps) {
    super(scope, id);

    const timeout = Duration.seconds(60);
    const openAiFunction = new NodejsFunction(this, "openAiFunction", {
      entry: path.join(__dirname, "/../../src/lambda/open-ai/index.js"),
      handler: "handler",
      timeout: timeout,
      environment: {
        basePath: process.env.OPENAI_BASE_PATH!,
        apikey: process.env.OPENAI_APIKEY!,
        maxTokens: process.env.MAX_TOKENS!,
        conversationBucket: props.conversationBucket.bucketName,
      },
      depsLockFilePath: path.join(__dirname, "/../../src/lambda/open-ai/package-lock.json"),
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime          
        ]
      },
    });
    props.conversationBucket.grantWrite(openAiFunction);


    const sessionTokenFunction = new NodejsFunction(this, "sessionTokenFunction", {
      entry: path.join(__dirname, "/../../src/lambda/session-token/index.js"),
      handler: "handler",
      timeout: timeout,
      depsLockFilePath: path.join(__dirname, "/../../src/lambda/session-token/package-lock.json"),
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime          
        ]
      },
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
      entry: path.join(__dirname, "/../../src/lambda/huggingface"),
      runtime: Runtime.PYTHON_3_9, // required
      memorySize: 512,
      timeout: Duration.seconds(60),
      environment: {
        huggingFaceodelEndpointName: hfConstruct.endpointName,
        conversationBucket: props.conversationBucket.bucketName,
      },
      initialPolicy: [hfConstruct.invokeEndPointPolicyStatement],
    });
    props.conversationBucket.grantWrite(huggingFaceFunction);


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