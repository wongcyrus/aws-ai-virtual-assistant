import * as cdk from 'aws-cdk-lib';
import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ChatApiConstruct } from './components/chat-api';
import { StaticSite as StaticSiteConstruct } from './components/static-site';
import { Analytics as AnalyticsConstruct } from './components/analytics';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const analytics = new AnalyticsConstruct(this, "Analytics");
    const chatApiConstruct = new ChatApiConstruct(this, "ChatApiConstruct", {conversationBucket:analytics.conversationBucket});
    const staticSite = new StaticSiteConstruct(this, "StaticSite", {});

    new CfnOutput(this, 'DemoUrl', {
      value: staticSite.siteUrl + "?apikey=" + (chatApiConstruct.unlimitedApiKey ?? "REPLACE_API_KEY_HERE") + "&endpoint=" + chatApiConstruct.endpoint,
      description: 'DemoUrl',
    });
  }
}
