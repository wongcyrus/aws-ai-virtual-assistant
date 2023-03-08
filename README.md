# ai-virtual-assistant
AI Chatbot with AWS Amplify Amazon Sumerian Hosts

Setup

```
npm install -g typescript
npm install -g prettier
npm install -g aws-cdk
```


# Deployment 

```
git clone https://github.com/wongcyrus/ai-virtual-assistant
cd cdk
npm i
cdk deploy --require-approval never
```
Note down the output.


# For web development

Build
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


