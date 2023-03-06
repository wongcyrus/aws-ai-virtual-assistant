import { Construct } from "constructs";
import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Bucket, StorageClass } from "aws-cdk-lib/aws-s3";

export class Analytics extends Construct {
    public readonly conversationBucket: Bucket;
    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.conversationBucket = new Bucket(this, 'Bucket', {
            publicReadAccess: false,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,            
            lifecycleRules: [
                {
                    expiration: Duration.days(30),                    
                },
            ],
        });

        new CfnOutput(this, 'ConversationBucket', {
            value: this.conversationBucket.bucketName,
            description: 'Conversation Bucket',
        });
    }
}
