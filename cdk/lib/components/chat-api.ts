
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod
} from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';

import { CfnOutput, Duration } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from 'constructs';
import path = require("path");

export interface ChatApiStackProps {

}

export class ChatApiConstruct extends Construct {

  constructor(scope: Construct, id: string, props: ChatApiStackProps) {
    super(scope, id);

    const timeout = Duration.seconds(30);
    const azureOpenAiFunction = new NodejsFunction(this, "azureOpenAiFunction", {
      entry: path.join(__dirname, "/../../src/lambda/azure-open-ai/index.js"),
      handler: "handler",
      timeout: timeout,
      environment:{
        basePath: process.env.OPENAI_BASE_PATH!,
        apikey:process.env.OPENAI_APIKEY!,
        maxTokens: process.env.MAX_TOKENS!,
      },
      depsLockFilePath:path.join(__dirname, "/../../src/lambda/azure-open-ai/package-lock.json"),
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime          
        ]
      },
    });

    const sessionTokenFunction = new NodejsFunction(this, "sessionTokenFunction", {
      entry: path.join(__dirname, "/../../src/lambda/session-token/index.js"),
      handler: "handler",
      timeout: timeout,
      environment:{
        basePath: process.env.OPENAI_BASE_PATH!,
        apikey:process.env.OPENAI_APIKEY!,
        maxTokens: process.env.MAX_TOKENS!,
      },
      depsLockFilePath:path.join(__dirname, "/../../src/lambda/session-token/package-lock.json"),
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime          
        ]
      },
    });


    // 👇 create our HTTP Api
    const httpApi = new HttpApi(this, 'httpApi', {
      description: 'HTTP API example',
      corsPreflight: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: [
          CorsHttpMethod.OPTIONS,
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PUT,
          CorsHttpMethod.PATCH,
          CorsHttpMethod.DELETE,
        ],
        allowCredentials: false,
        allowOrigins: ['*'],
      },
    });

    const azureOpenAiIntegration = new HttpLambdaIntegration('azureOpenAiIntegration', azureOpenAiFunction);
    httpApi.addRoutes({
      path: '/azureOpenAi',
      methods: [HttpMethod.GET,HttpMethod.POST],
      integration: azureOpenAiIntegration,
    });

    const sessionTokenIntegration = new HttpLambdaIntegration('sessionTokenIntegration', sessionTokenFunction);
    httpApi.addRoutes({
      path: '/sessionToken',
      methods: [HttpMethod.GET],
      integration: sessionTokenIntegration,
    });

    new CfnOutput(this, 'HttpEndpoint', {
      value: httpApi.url!,
      description: 'Http Api',     
    });
  }
}