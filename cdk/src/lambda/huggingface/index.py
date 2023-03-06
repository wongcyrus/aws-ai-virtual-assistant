import os
import json
import sagemaker
import boto3
from sagemaker.huggingface.model import HuggingFacePredictor

import datetime
import json
from datetime import datetime


sess = sagemaker.Session()
s3 = boto3.resource('s3')


def upload_json_to_s3(json_data, key):
    s3.Bucket(os.environ['conversationBucket']
              ).put_object(Key=key, Body=json_data)


def inference(body):
    message = json.loads(body)
    predictor = HuggingFacePredictor(
        endpoint_name=os.environ['huggingFaceodelEndpointName'], sagemaker_session=sess)
    data = {
        'inputs': {
            "past_user_inputs": message["past_user_inputs"],
            "generated_responses": message["generated_responses"],
            "text": message["text"]
        }
    }
    res = predictor.predict(data=data)
    print(res)
    return message["text"], res["generated_text"]


def handler(event, context):
    body = event["body"] if event["httpMethod"] == "POST" else event["queryStringParameters"]["ask"]

    now = datetime.now()
    date_string = now.strftime('%Y-%m-%d')
    api_key = event["requestContext"]["identity"]["apiKeyId"]
    ip_address = event["requestContext"]["identity"]["sourceIp"]
    name = now.strftime('%H-%M-%S')

    key = f'date={date_string}/apikeyid={api_key}/{name}.json'

    question, answer = inference(body)

    data = {"question": question, "answer": answer,
            "sourceIp": ip_address, "model": "huggingface", "time": now.strftime("%Y-%m-%d %H:%M:%S.%f")}
    upload_json_to_s3(json.dumps(data), key)
    return {
        "headers": {
            'Access-Control-Allow-Origin': '*',
        },
        "body": json.dumps({"message": answer}),
        "statusCode": 200,
    }
