import os
import json
import hashlib
import boto3
import sagemaker
from botocore.exceptions import ClientError

from crhelper import CfnResource
import logging

from sagemaker.huggingface.model import HuggingFaceModel, HuggingFacePredictor
from sagemaker.serverless import ServerlessInferenceConfig


logger = logging.getLogger(__name__)
# Initialise the helper, all inputs are optional, this example shows the defaults
helper = CfnResource(json_logging=False, log_level='DEBUG',
                     boto_level='CRITICAL', sleep_on_delete=120, ssl_verify=None)

try:
    sess = sagemaker.Session()
    # sagemaker session bucket -> used for uploading data, models and logs
    # sagemaker will automatically create this bucket if it not exists
    sagemaker_session_bucket = None
    if sagemaker_session_bucket is None and sess is not None:
        # set to default bucket if a bucket name is not given
        sagemaker_session_bucket = sess.default_bucket()
    role = os.environ['sageMakerRoleArn']
    sess = sagemaker.Session(default_bucket=sagemaker_session_bucket)

    print(f"sagemaker role arn: {role}")
    print(f"sagemaker bucket: {sess.default_bucket()}")
    print(f"sagemaker session region: {sess.boto_region_name}")
    pass
except Exception as e:
    helper.init_failure(e)


def handler(event, context):
    print(event)
    helper(event, context)


@helper.create
def create(event, context):
    logger.info("Got Create")
    # Hub Model configuration. <https://huggingface.co/models>
    hub = {
        'HF_MODEL_ID': os.environ['hfModelId'],
        'HF_TASK': os.environ['hfTask']
    }

    # create Hugging Face Model Class
    huggingface_model = HuggingFaceModel(
        env=hub,                      # configuration for loading model from Hub
        role=role,                    # iam role with permissions to create an Endpoint
        transformers_version="4.17.0",  # transformers version used
        pytorch_version="1.10.2",        # pytorch version used
        py_version='py38',            # python version used
    )

    # Specify MemorySizeInMB and MaxConcurrency in the serverless config object
    serverless_config = ServerlessInferenceConfig(
        memory_size_in_mb=int(os.environ["memorySizeInMb"]), max_concurrency=int(os.environ["maxConcurrency"]),
    )

    # deploy the endpoint endpoint
    predictor = huggingface_model.deploy(
        serverless_inference_config=serverless_config
    )

    print(predictor.endpoint_name)
    helper.Data['endpoint_name'] = predictor.endpoint_name
    return predictor.endpoint_name


@helper.delete
def delete(event, context):
    logger.info("Got Delete")
    physical_id = event["PhysicalResourceId"]
    predictor = HuggingFacePredictor(
        endpoint_name=physical_id, sagemaker_session=sess)
    predictor.delete_model()
    predictor.delete_endpoint()


@helper.update
def update(event, context):
    logger.info("Got Update")
    delete(event, context)
    return create(event, context)
