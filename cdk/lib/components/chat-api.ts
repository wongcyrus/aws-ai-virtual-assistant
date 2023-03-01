


import { CfnOutput, Duration } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import path = require("path");
import { Cors, LambdaIntegration, Period, RestApi } from "aws-cdk-lib/aws-apigateway";

export interface ChatApiStackProps {

}

export class ChatApiConstruct extends Construct {

  constructor(scope: Construct, id: string, props: ChatApiStackProps) {
    super(scope, id);

    const timeout = Duration.seconds(30);
    const openAiFunction = new NodejsFunction(this, "openAiFunction", {
      entry: path.join(__dirname, "/../../src/lambda/open-ai/index.js"),
      handler: "handler",
      timeout: timeout,
      environment: {
        basePath: process.env.OPENAI_BASE_PATH!,
        apikey: process.env.OPENAI_APIKEY!,
        maxTokens: process.env.MAX_TOKENS!,
      },
      depsLockFilePath: path.join(__dirname, "/../../src/lambda/open-ai/package-lock.json"),
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime          
        ]
      },
    });

    ;

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

    const pollyRole = new iam.Role(this, 'pollyRole', {
      assumedBy: sessionTokenFunction.grantPrincipal,
      description: 'An IAM role for Amazon Polly',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonPollyReadOnlyAccess',
        ),
      ],
    });

    sessionTokenFunction.role!.addToPrincipalPolicy(
      new iam.PolicyStatement({
        resources: [pollyRole.roleArn],
        actions: ['sts:AssumeRole'],
      })
    );

    sessionTokenFunction.addEnvironment("pollyRole", pollyRole.roleArn);

    const aiVirtualAssistantApi = new RestApi(this, 'aiVirtualAssistantApi',
      {
        defaultCorsPreflightOptions: {
          allowOrigins: Cors.ALL_ORIGINS,
        },
      });

    const azureOpenAiLambdaIntegration = new LambdaIntegration(openAiFunction);
    const sessionTokenLambdaIntegration = new LambdaIntegration(sessionTokenFunction);

    const v1 = aiVirtualAssistantApi.root.addResource('v1');
    const r = v1.addResource('azure-open-ai');
    r.addMethod('GET', azureOpenAiLambdaIntegration, { apiKeyRequired: true });
    r.addMethod('POST', azureOpenAiLambdaIntegration, { apiKeyRequired: true });
    v1.addResource('session-token').addMethod('GET', sessionTokenLambdaIntegration, { apiKeyRequired: true });

    const prod = aiVirtualAssistantApi.deploymentStage;

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

    // const apiKeyValue = "somethingsecret";
    // const demoUserKey = prod.addApiKey('DemoApiKey', {
    //   apiKeyName: 'demo',
    //   value: apiKeyValue,
    // });
    // plan.addApiKey(demoUserKey);
    // new CfnOutput(this, 'DemoUserApiKey', {
    //   value: apiKeyValue,
    //   description: 'Demo User ApiKey',
    // });

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