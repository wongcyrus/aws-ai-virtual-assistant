import { TranscribeStreamingClient } from "@aws-sdk/client-transcribe-streaming";
import MicrophoneStream from "microphone-stream";
import { StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
import { Buffer } from "buffer";

const SAMPLE_RATE = 44100;
let microphoneStream = undefined;
let transcribeClient = undefined;

export const startRecording = async (language, callback) => {
  if (!language) {
    return false;
  }
  if (microphoneStream || transcribeClient) {
    stopRecording();
  }
  await createTranscribeClient();
  createMicrophoneStream();
  await startStreaming(language, callback);
};

export const stopRecording = function () {
  if (microphoneStream) {
    microphoneStream.stop();
    microphoneStream.destroy();
    microphoneStream = undefined;
  }
  if (transcribeClient) {
    transcribeClient.destroy();
    transcribeClient = undefined;
  }
};

const createTranscribeClient = async () => {
  function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  }

  async function getAWsCredentials() {
    let sessionCredentials = await $.ajax({
      url: endpoint + 'session-token',
      contentType: 'application/json',
      dataType: 'json',
      headers: {
        "X-Api-Key": apikey
      }
    });

    return {
      accessKeyId: sessionCredentials["AccessKeyId"],
      secretAccessKey: sessionCredentials["SecretAccessKey"],
      sessionToken: sessionCredentials["SessionToken"]
    };
  }
  const urlParams = getUrlVars();
  const apikey = urlParams['apikey'];
  const endpoint = urlParams['endpoint'];

  const c = await getAWsCredentials();
  transcribeClient = new TranscribeStreamingClient({
    region: "us-east-1",
    credentials: c
  });
  console.log(transcribeClient);
}

const createMicrophoneStream = async () => {
  microphoneStream = new MicrophoneStream.default();
  microphoneStream.setStream(
    await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    })
  );
}

const startStreaming = async (language, callback) => {
  const command = new StartStreamTranscriptionCommand({
    LanguageCode: language,
    MediaEncoding: "pcm",
    MediaSampleRateHertz: SAMPLE_RATE,
    AudioStream: getAudioStream(),
  });
  const data = await transcribeClient.send(command);
  for await (const event of data.TranscriptResultStream) {
    for (const result of event.TranscriptEvent.Transcript.Results || []) {
      if (result.IsPartial === false) {
        const noOfResults = result.Alternatives[0].Items.length;
        for (let i = 0; i < noOfResults; i++) {
          console.log(result.Alternatives[0].Items[i].Content);
          callback(result.Alternatives[0].Items[i].Content + " ");
        }
      }
    }
  }
}

const getAudioStream = async function* () {
  for await (const chunk of microphoneStream) {
    if (chunk.length <= SAMPLE_RATE) {
      yield {
        AudioEvent: {
          AudioChunk: encodePCMChunk(chunk),
        },
      };
    }
  }
};

const encodePCMChunk = (chunk) => {
  const input = MicrophoneStream.default.toRaw(chunk);
  let offset = 0;
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return Buffer.from(buffer);
};

// snippet-end:[transcribeClient.JavaScript.streaming.createclientv3]
