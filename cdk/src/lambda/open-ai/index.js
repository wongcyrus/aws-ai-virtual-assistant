const { Configuration, OpenAIApi } = require("openai");
import AWS from 'aws-sdk'

const s3 = new AWS.S3();

const stop = "\n\n\n\n\n";

function padTo2Digits(num) {
  return num.toString().padStart(2, '0');
}

function formatDate(date) {
  return (
    [
      date.getFullYear(),
      padTo2Digits(date.getMonth() + 1),
      padTo2Digits(date.getDate()),
    ].join('-') +
    ' ' +
    [
      padTo2Digits(date.getHours()),
      padTo2Digits(date.getMinutes()),
      padTo2Digits(date.getSeconds()),
    ].join(':') + ".000000"
  );
}

export async function handler(event) {
  const conversation = JSON.parse(event.body);
  const combiner = (a, b) => a.map((k, i) => k + stop + b[i] + stop);
  const message = combiner(conversation.past_user_inputs, conversation.generated_responses).join(stop) + stop + conversation.text;

  let answer = process.env.basePath ? await azureOpenAi(message) : await openAi(message);
  console.log(answer);

  const rightNow = new Date();
  const dateString = rightNow.toISOString().slice(0, 10);
  const timeString = padTo2Digits(rightNow.getHours()) + "-" + padTo2Digits(rightNow.getMinutes()) + "-" + padTo2Digits(rightNow.getSeconds());
  await s3.upload({
    Bucket: process.env.conversationBucket,
    Key: `date=${dateString}/apikeyid=${event.requestContext.identity.apiKeyId}/${timeString}.json`,
    Body: JSON.stringify({ question: conversation.text, answer: answer, sourceIp: event.requestContext.identity.sourceIp, model: "openai", time: formatDate(rightNow) })
  }).promise();

  return {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ message: answer }),
    statusCode: 200,
  };
}

async function azureOpenAi(message) {
  const configuration = new Configuration({
    basePath: process.env.basePath,
  });
  const openai = new OpenAIApi(configuration);

  const completion = await openai.createCompletion({
    prompt: "##" + message,
    temperature: 0.7,
    max_tokens: parseInt(process.env.maxTokens),
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    stop: stop
  }, {
    headers: {
      'api-key': process.env.apikey,
    },
    params: { "api-version": "2022-12-01" }
  });
  return completion.data.choices[0].text;
}

async function openAi(message) {
  const configuration = new Configuration({
    apiKey: process.env.apikey,
  });
  const openai = new OpenAIApi(configuration);

  const completion = await openai.createCompletion({
    model: "text-davinci-002",
    prompt: "##" + message,
    temperature: 0.7,
    max_tokens: parseInt(process.env.maxTokens),
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    stop: stop
  });
  return completion.data.choices[0].text;
}


