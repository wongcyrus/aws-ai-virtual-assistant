import * as cdk from 'aws-cdk-lib';
import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ChatApiConstruct } from './components/chat-api';
import { StaticSite } from './components/static-site';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const chatApiConstruct = new ChatApiConstruct(this, "ChatApiConstruct", {});
    const staticSite = new StaticSite(this, "StaticSite", {});

    new CfnOutput(this, 'DemoUrl', {
      value: staticSite.siteUrl + "?apikey=" + (chatApiConstruct.unlimitedApiKey ?? "REPLACE_API_KEY_HERE") + "&endpoint=" + chatApiConstruct.endpoint,
      description: 'DemoUrl',
    });
  }
}
