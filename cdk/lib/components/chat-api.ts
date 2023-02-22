
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
    const chatFunction = new NodejsFunction(this, "chatFunction", {
      entry: path.join(__dirname, "/../../src/lambda/chat/index.js"),
      handler: "handler",
      timeout: timeout,
      bundling: {
        externalModules: [
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
          'openai'
        ],
      },
    });


    // 👇 create our HTTP Api
    const httpApi = new HttpApi(this, 'http-api-example', {
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


    const chatIntegration = new HttpLambdaIntegration('chatIntegration', chatFunction);

    httpApi.addRoutes({
      path: '/chat',
      methods: [HttpMethod.GET],
      integration: chatIntegration,
    });

    new CfnOutput(this, 'HttpEndpoint', {
      value: httpApi.url!,
      description: 'Http Api',     
    });
  }
}