# AWS AI Virtual Assistant
AWS AI Assistant is a serverless applications and integrates most of the AWS AI/ML services and Open AI.

# Demo

Voice chat

[![AWS AI Virtual Assistant with OpenAI Hand Free voice chat demo](https://img.youtube.com/vi/aPOCSAD4jKk/0.jpg)](https://www.youtube.com/watch?v=aPOCSAD4jKk)

Voice chat in VR mode

[![AWS AI Virtual Assistant VR mode Voice Chat Demo](https://img.youtube.com/vi/1ZNF-yGsM8g/0.jpg)](https://www.youtube.com/watch?v=1ZNF-yGsM8g)

# Configuration 
Rename ```.env.template``` to ```.env```
```
AZURE_OPENAI_BASE_PATH="https://<XXXX>.openai.azure.com/openai/deployments/"
OPENAI_APIKEY="API_KEY"
MAX_TOKENS=500
QUOTA=100
UNLIMIT_KEY=
PROBLEM_EMAIL=
```
1. Using Azure OpenAI, you need to provide AZURE_OPENAI_BASE_PATH.
2. Using standard OpenAI, you need to leave AZURE_OPENAI_BASE_PATH blank.
3. Need a unlimited key for demo or preview, you need to provide UNLIMIT_KEY.
4. Provide PROBLEM_EMAIL to get email alert when there is any very negative message from user.
5. QUOTA is the daily limit.


# Deployment with CodeSpaces

```
./deployment.sh 
```
Note down the output.
1. AiVirtualAssistantStack.DemoUrl - Link for the chatbot
2. AiVirtualAssistantStack.ChatApiConstructusagePlanIDXXXX - Usage plan ID with Rate and quota limit, then use https://github.com/wongcyrus/aws-apigateway-api-key-tools to generate API Key and email to your user.


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


