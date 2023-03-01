import os
import json
import sagemaker

from sagemaker.huggingface.model import HuggingFaceModel, HuggingFacePredictor
from sagemaker.serverless import ServerlessInferenceConfig

sess = sagemaker.Session()


def inference(body):
    message = json.loads(body)
    predictor = HuggingFacePredictor(
        endpoint_name=os.environ['huggingFaceodelEndpointName'], sagemaker_session=sess)
    data = {
        'inputs': {
            "past_user_inputs": [message["past_user_inputs"]],
            "generated_responses": [message["generated_responses"]],
            "text": message["text"]
        }
    }
    res = predictor.predict(data=data)
    print(res)
    return res["generated_text"]


def handler(event, context):
    body = event["body"] if event.httpMethod == "POST" else event["queryStringParameters"]["ask"]

    reply = inference(body)
    return {
        "headers": {
            'Access-Control-Allow-Origin': '*',
        },
        "body": json.dumps({"message": reply}),
        "statusCode": 200,
    }
