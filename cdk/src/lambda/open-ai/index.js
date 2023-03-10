const { Configuration, OpenAIApi } = require("openai");
import AWS from 'aws-sdk'

const s3 = new AWS.S3();
const comprehend = new AWS.Comprehend();
const sns = new AWS.SNS();

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
    ].join(':')
  );
}

export async function handler(event) {
  const conversation = JSON.parse(event.body);
  const combiner = (a, b) => a.map((k, i) => k + stop + b[i] + stop);
  const model = conversation.model;
  const question = conversation.text;
  const sourceIp = event.requestContext.identity.sourceIp;

  let answer = "";
  if (process.env.basePath) {
    if (model === "gpt-35-tubo") {
      answer = await azureOpenAiChatGPT(conversation, sourceIp, model);
    } else {
      const message = combiner(conversation.past_user_inputs, conversation.generated_responses).join(stop) + stop + question;
      answer = await azureOpenAi(message, model);
    }
  } else {
    if (model === "gpt-35-tubo") {
      answer = await openAiChatGPT(conversation, sourceIp, model);
    } else {
      const message = combiner(conversation.past_user_inputs, conversation.generated_responses).join(stop) + stop + question;
      answer = await openAi(message, model);
    }
  }
  console.log(answer);

  const resp = await comprehend.detectDominantLanguage({ Text: question }).promise();
  let languageCode = resp.Languages[0].LanguageCode;
  languageCode = ["ar", "hi", "ko", "zh-TW", "ja", "zh", "de", "pt", "en", "it", "fr", "es"].includes(languageCode) ? languageCode : "en";
  const sentiment = await comprehend.detectSentiment({ Text: question, LanguageCode: languageCode }).promise();

  const rightNow = new Date();
  const dateString = rightNow.toISOString().slice(0, 10);
  const timeString = padTo2Digits(rightNow.getHours()) + "-" + padTo2Digits(rightNow.getMinutes()) + "-" + padTo2Digits(rightNow.getSeconds());
  await s3.upload({
    Bucket: process.env.conversationBucket,
    Key: `day=${dateString}/apikeyid=${event.requestContext.identity.apiKeyId}/${timeString}.json`,
    Body: JSON.stringify({
      question: question,
      answer: answer,
      sourceIp: event.requestContext.identity.sourceIp,
      model: "openai," + model,
      time: formatDate(rightNow),
      sentiment: sentiment.Sentiment,
      sentimentScore: sentiment.SentimentScore,
      language: languageCode
    })
  }).promise();

  if (sentiment.Sentiment === "NEGATIVE" && sentiment.SentimentScore.Negative > 0.7) {
    await sns.publish({
      Subject: "Very Negative Sentiment Detected",
      Message: JSON.stringify(
        {
          question: question,
          answer: answer,
          apiKeyId: event.requestContext.identity.apiKeyId,
          model: "openai", time: formatDate(rightNow),
          score: sentiment.SentimentScore.Negative,
        }),
      TopicArn: process.env.problemTopicArn
    }).promise();
  }

  return {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ message: answer }),
    statusCode: 200,
  };
}

async function azureOpenAi(message, model) {
  const configuration = new Configuration({
    basePath: process.env.basePath + model,
  });
  const openai = new OpenAIApi(configuration);
  try {
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
  } catch (e) {
    console.error(e);
    return "";
  }
}

function messageCombiner(a, b) {
  return a.map((k, i) => ({ sender: k, text: b[i] }));
}

function createPrompt(system_message, messages) {
  let prompt = system_message;
  for (const message of messages) {
    prompt += `\n<|im_start|>${message.sender}\n${message.text}\n<|im_end|>`;
  }
  prompt += "\n<|im_start|>assistant\n";
  return prompt;
}

async function azureOpenAiChatGPT(conversation, ip, model) {
  const messages = messageCombiner(conversation.past_user_inputs, conversation.generated_responses);
  const systemMessage = "<|im_start|>system\n{'What can I help you?'}\n<|im_end|>"
  messages.push({ sender: ip, text: conversation.text });

  const configuration = new Configuration({
    basePath: process.env.basePath + model,
  });
  const openai = new OpenAIApi(configuration);
  try {
    const completion = await openai.createCompletion({
      prompt: createPrompt(systemMessage, messages),
      max_tokens: 800,
      temperature: 0.7,
      frequency_penalty: 0,
      presence_penalty: 0,
      top_p: 0.95,
      stop: ["<|im_end|>"]
    }, {
      headers: {
        'api-key': process.env.apikey,
      },
      params: { "api-version": "2022-12-01" }
    });
    return completion.data.choices[0].text;
  } catch (e) {
    console.error(e);
    return "";
  }
}

async function openAiChatGPT(message, model) {
  const messages = messageCombiner(conversation.past_user_inputs, conversation.generated_responses);
  const systemMessage = "<|im_start|>system\n{'What can I help you?'}\n<|im_end|>"
  messages.push({ sender: ip, text: prompt });

  const configuration = new Configuration({
    apiKey: process.env.apikey,
  });
  const openai = new OpenAIApi(configuration);
  try {
    const completion = await openai.createCompletion({
      prompt: createPrompt(systemMessage, messages),
      max_tokens: 800,
      temperature: 0.7,
      frequency_penalty: 0,
      presence_penalty: 0,
      top_p: 0.95,
      stop: ["<|im_end|>"]
    });
    return completion.data.choices[0].text;
  } catch (e) {
    console.error(e);
    return "";
  }
}


async function openAi(message, model) {
  const configuration = new Configuration({
    apiKey: process.env.apikey,
  });
  const openai = new OpenAIApi(configuration);

  try {
    const completion = await openai.createCompletion({
      model: model,
      prompt: "##" + message,
      temperature: 0.7,
      max_tokens: parseInt(process.env.maxTokens),
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stop: stop
    });
    return completion.data.choices[0].text;
  } catch (e) {
    console.error(e);
    return "";
  }
}

