import AWS from "aws-sdk";
import {
  BedrockRuntimeClient,
  InvokeModelCommand
} from "@aws-sdk/client-bedrock-runtime";

const s3 = new AWS.S3();
const comprehend = new AWS.Comprehend();
const sns = new AWS.SNS();

const stop = "\n\n\n\n\n";

function padTo2Digits(num) {
  return num.toString().padStart(2, "0");
}

function formatDate(date) {
  return (
    [
      date.getFullYear(),
      padTo2Digits(date.getMonth() + 1),
      padTo2Digits(date.getDate())
    ].join("-") +
    " " +
    [
      padTo2Digits(date.getHours()),
      padTo2Digits(date.getMinutes()),
      padTo2Digits(date.getSeconds())
    ].join(":")
  );
}

export async function handler(event) {
  const conversation = JSON.parse(event.body);
  const model = conversation.model;
  const question = conversation.text;
  const sourceIp = event.requestContext.identity.sourceIp;

  let answer = await bedrockChat(conversation, model);  
  console.log(answer);
  const resp = await comprehend
    .detectDominantLanguage({ Text: question })
    .promise();
  let languageCode = resp.Languages[0].LanguageCode;
  languageCode = [
    "ar",
    "hi",
    "ko",
    "zh-TW",
    "ja",
    "zh",
    "de",
    "pt",
    "en",
    "it",
    "fr",
    "es"
  ].includes(languageCode)
    ? languageCode
    : "en";
  const sentiment = await comprehend
    .detectSentiment({ Text: question, LanguageCode: languageCode })
    .promise();

  const rightNow = new Date();
  const dateString = rightNow.toISOString().slice(0, 10);
  const timeString =
    padTo2Digits(rightNow.getHours()) +
    "-" +
    padTo2Digits(rightNow.getMinutes()) +
    "-" +
    padTo2Digits(rightNow.getSeconds());
  await s3
    .upload({
      Bucket: process.env.conversationBucket,
      Key: `day=${dateString}/apikeyid=${event.requestContext.identity.apiKeyId}/${timeString}.json`,
      Body: JSON.stringify({
        question: question,
        answer: answer,
        sourceIp: sourceIp,
        model: model,
        time: formatDate(rightNow),
        sentiment: sentiment.Sentiment,
        sentimentScore: sentiment.SentimentScore,
        language: languageCode
      })
    })
    .promise();

  if (
    sentiment.Sentiment === "NEGATIVE" &&
    sentiment.SentimentScore.Negative > 0.7
  ) {
    await sns
      .publish({
        Subject: "Very Negative Sentiment Detected",
        Message: JSON.stringify({
          question: question,
          answer: answer,
          apiKeyId: event.requestContext.identity.apiKeyId,
          model: model,
          time: formatDate(rightNow),
          score: sentiment.SentimentScore.Negative
        }),
        TopicArn: process.env.problemTopicArn
      })
      .promise();
  }

  return {
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ message: answer }),
    statusCode: 200
  };
}

async function bedrockChat(message, model) {
  const bedrockClient = new BedrockRuntimeClient({
    region: process.env.region
  });
  const command = new InvokeModelCommand({
    modelId: model,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      prompt: message,
      maxTokens: 200,
      temperature: 0.7,
      topP: 1,
      stopSequences: [],
      countPenalty: { scale: 0 },
      presencePenalty: { scale: 0 },
      frequencyPenalty: { scale: 0 }
    })
  });
  const response = await bedrockClient.send(command);
  // Save the raw response
  const rawRes = response.body;
  // Convert it to a JSON String
  const jsonString = new TextDecoder().decode(rawRes);
  const parsedResponse = JSON.parse(jsonString);
  return parsedResponse.completions[0].data.text;
}
