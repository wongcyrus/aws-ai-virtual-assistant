import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ChatApiConstruct } from './components/chat-api';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    const ahatApiStack = new ChatApiConstruct(this,"ChatApiStack",{});
  }
}