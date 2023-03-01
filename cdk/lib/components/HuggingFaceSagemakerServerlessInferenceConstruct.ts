
import { Construct } from "constructs";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import * as path from "path";
import { Duration, CustomResource, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  Role,
  ServicePrincipal,
  ManagedPolicy,
  PolicyStatement,
} from "aws-cdk-lib/aws-iam";

export interface HuggingFaceSagemakerServerlessInferenceConstructProps {
  hfModelId: string;
  hfTask: string;
  memorySizeInMb?: number;
  maxConcurrency?: number;
}

export class HuggingFaceSagemakerServerlessInferenceConstruct extends Construct {
  public readonly endpointName: string;
  public readonly invokeEndPointPolicyStatement: PolicyStatement;
  constructor(
    scope: Construct,
    id: string,
    props: HuggingFaceSagemakerServerlessInferenceConstructProps
  ) {
    super(scope, id);

    const sageMakerRole = new Role(this, "Role", {
      assumedBy: new ServicePrincipal("sagemaker.amazonaws.com"),
    });
    sageMakerRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess")
    );

    const customerResourceFunction = new PythonFunction(
      this,
      "customerResourceFunction",
      {
        index: "index.py", // optional, defaults to 'index.py'
        handler: "handler", // optional, defaults to 'handler'
        runtime: Runtime.PYTHON_3_9, // required,
        description: "HuggingFaceModelCustomResources",
        entry: path.join(
          __dirname,
          "..",
          "..",
          "src",
          "lambda",
          "HuggingFaceModelCustomResources"
        ), // required
        environment: {
          hfModelId: props.hfModelId,
          hfTask: props.hfTask,
          memorySizeInMb: "" + (props.memorySizeInMb || "4096"),
          maxConcurrency: "" + (props.maxConcurrency || "5"),
          sageMakerRoleArn: sageMakerRole.roleArn,
        },
        timeout: Duration.minutes(15),
      }
    );
    customerResourceFunction.role?.grantPassRole(sageMakerRole);
    customerResourceFunction.role?.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess")
    );

    const huggingFaceModelSagemakerServerlessInferneceCustomResource =
      new CustomResource(
        this,
        "huggingFaceModelSagemakerServerlessInferneceCustomResource",
        {
          serviceToken: customerResourceFunction.functionArn,
          removalPolicy: RemovalPolicy.DESTROY,
        }
      );
    this.endpointName =
      huggingFaceModelSagemakerServerlessInferneceCustomResource.getAttString(
        "endpoint_name"
      );

    this.invokeEndPointPolicyStatement = new PolicyStatement({
      actions: ["sagemaker:InvokeEndpoint"],
      resources: [
        `arn:aws:sagemaker:${Stack.of(this).region}:${Stack.of(this).account
        }:endpoint/${this.endpointName}`,
      ],
    });
  }
}