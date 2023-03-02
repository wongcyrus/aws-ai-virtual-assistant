/* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0

ABOUT THIS NODE.JS EXAMPLE: This example works with the AWS SDK for JavaScript version 3 (v3),
which is available at https://github.com/aws/aws-sdk-js-v3.

Purpose:
index.js is part of a tutorial demonstrating how to:
- Transcribe speech in real-time using Amazon Transcribe
- Detect the language of the transcription using Amazon Comprehend
- Translate the transcription using Amazon Translate
- Send the transcription and translation by email using Amazon Simple Email Service (Amazon SES)
*/

// snippet-start:[transcribe.JavaScript.streaming.indexv3]
import * as TranscribeClient from "./libs/transcribeClient.js";

const recordButton = document.getElementById("record");
const inputLanguageList = document.getElementById("inputLanguageList");
const transcribedText = document.getElementById("transcribedText");

window.onRecordPress = () => {
  if (recordButton.getAttribute("class") === "recordInactive") {
    startRecording();
  } else {
    stopRecording();
  }
};

const startRecording = async () => {
  window.clearTranscription();
  const selectedLanguage = inputLanguageList.value;
  if (selectedLanguage === "nan") {
    alert("Please select a language");
    return;
  }
  inputLanguageList.disabled = true;
  recordButton.setAttribute("class", "recordActive");
  try {
    await TranscribeClient.startRecording(selectedLanguage, onTranscriptionDataReceived);
  } catch (error) {
    alert("An error occurred while recording: " + error.message);
    stopRecording();
  }
};

const onTranscriptionDataReceived = (data) => {
  transcribedText.insertAdjacentHTML("beforeend", data); 
}

const stopRecording = function () {
  inputLanguageList.disabled = false;
  recordButton.setAttribute("class", "recordInactive");
  TranscribeClient.stopRecording();
};

window.clearTranscription = () => {
  transcribedText.innerHTML = "";
};
