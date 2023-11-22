# AWS AI Virtual Assistant
AWS AI Assistant is a serverless applications and integrates most of the AWS AI/ML services and Amazon Bedrock.
https://www.linkedin.com/pulse/revolutionize-your-virtual-assistant-experience-ai-vr-wong-1rpwf/

![Revolutionize Your Virtual Assistant Experience: Create a Powerful AI VR Assistant with Amazon Bedrock and AWS AI/ML Services](https://www.linkedin.com/pulse/revolutionize-your-virtual-assistant-experience-ai-vr-wong-1rpwf/)

![Architecture](https://media.licdn.com/dms/image/D4D12AQEWlMPJTAm5cQ/article-cover_image-shrink_423_752/0/1700554199804?e=1706140800&v=beta&t=shCg_52pJc2kfPv_hpnuh6u3LL7RcGqkJBht2X2LEbc "Architecture")

# Demo

Voice chat

[![AWS AI Virtual Assistant with Amazon Bedrock Hand Free voice chat demo](https://img.youtube.com/vi/aPOCSAD4jKk/0.jpg)](https://www.youtube.com/watch?v=aPOCSAD4jKk)

Voice chat in VR mode

[![AWS AI Virtual Assistant VR mode Voice Chat Demo](https://img.youtube.com/vi/1ZNF-yGsM8g/0.jpg)](https://www.youtube.com/watch?v=1ZNF-yGsM8g)



# Configuration 
Rename ```.env.template``` to ```.env```
```
MAX_TOKENS=500
QUOTA=100
UNLIMIT_KEY=
PROBLEM_EMAIL=
```
1. Need a unlimited key for demo or preview, you need to provide UNLIMIT_KEY.
2. Provide PROBLEM_EMAIL to get email alert when there is any very negative message from user.
3. QUOTA is the daily limit.


# Deployment in Cloud9
```
./deployment.sh 
```
Note down the output.
1. AiVirtualAssistantStack.DemoUrl - Link for the chatbot
2. AiVirtualAssistantStack.ChatApiConstructusagePlanIDXXXX - Usage plan ID with Rate and quota limit, then use https://github.com/wongcyrus/aws-apigateway-api-key-tools to generate API Key and email to your user.

## Undeployment
```
./undeployment.sh 
```

# For web development
Build the site, after modifying JavaScript or CSS.
```
cd web/src/
npm run build
```

Preview 
```
cd web/src/
python3 -m http.server 8080
```

You need to append the query parameter.
?apikey=XXXXXXXXX&endpoint=https://XXXXXX.execute-api.us-east-1.amazonaws.com/prod/v1/


