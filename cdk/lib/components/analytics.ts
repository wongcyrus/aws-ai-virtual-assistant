import { Construct } from "constructs";
import { CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";

import * as glue from 'aws-cdk-lib/aws-glue';

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

        const conversationDb = new glue.CfnDatabase(this, "conversationDb", {
            catalogId: Stack.of(this).account,
            databaseInput: {
                name: "ai-conversation",
                description: "AI Conversation Database"
            }
        });

        const table = new glue.CfnTable(this, "conversationTable", {
            catalogId: Stack.of(this).account,
            databaseName: conversationDb.ref,
            tableInput: {
                name: "conversation",
                description: "AI Conversation Table",
                tableType: "EXTERNAL_TABLE",
                parameters: {
                    'CrawlerSchemaDeserializerVersion': "1.0",
                    'CrawlerSchemaSerializerVersion': "1.0",
                    'classification': "json",
                    'compressionType': "none",
                    'typeOfData': "file",
                },
                partitionKeys: [
                    { name: "date", type: "date" },
                    { name: "apikeyid", type: "string" }
                ],
                storageDescriptor: {
                    bucketColumns: [],
                    columns: [
                        { name: "question", type: "string" },
                        { name: "answer", type: "string" },
                        { name: "sourceip", type: "string" },
                        { name: "model", type: "string" },
                        { name: "time", type: "timestamp" },
                        { name: "sentiment", type: "string" },
                        { name: "sentimentscore", type: "struct<positive:double,negative:double,neutral:double,mixed:double>" },
                        { name: "language", type: "string" },
                    ],
                    compressed: false,
                    inputFormat: "org.apache.hadoop.mapred.TextInputFormat",
                    location: "s3://" + this.conversationBucket.bucketName + "/",
                    numberOfBuckets: -1,
                    outputFormat: "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat",
                    parameters: {
                        'classification': "json",
                        'compressionType': "none",
                        'typeOfData': "file",
                    },
                    serdeInfo: {
                        serializationLibrary: "org.openx.data.jsonserde.JsonSerDe",
                        parameters: {
                            paths: "answer,model,question,sourceIp,time"
                        }
                    },
                    sortColumns: [],
                    storedAsSubDirectories: false
                }
            }
        });


        new CfnOutput(this, 'ConversationBucket', {
            value: this.conversationBucket.bucketName,
            description: 'Conversation Bucket',
        });
    }
}
