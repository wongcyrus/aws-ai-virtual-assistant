import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ChatApiConstruct } from './components/chat-api';
import { StaticSite } from './components/static-site';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new ChatApiConstruct(this,"ChatApiConstruct",{});
    new StaticSite(this,"StaticSite",{});
  }
}
