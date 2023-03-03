# Cross-service example: Building an Amazon Transcribe streaming app

## Purpose
The cross-service example demonstrates how to build an app that records and transcribes an audio stream in real-time. It
also demonstrates how to translate the transcription and send it via email to your contacts. The app uses the following
AWS services:
- [Amazon Transcribe](https://aws.amazon.com/transcribe/)
- [Amazon Comprehend](https://aws.amazon.com/comprehend/)
- [Amazon Translate](https://aws.amazon.com/translate/)
- [Amazon Simple Email Services (SES)](https://aws.amazon.com/ses/)

The JavaScript SDK Transcribe Streaming client encapsulates the API into a JavaScript 
library that can be run on browsers, Node.js and potentially React Native. By default, 
the client uses HTTP/2 connection on Node.js, and uses WebSocket connection on browsers 
and React Native.


## Create a Node.js project environment

1. Clone the [AWS Code Samples repo](https://github.com/awsdocs/aws-doc-sdk-examples) to your local environment. 
See [the Github documentation](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) for 
instructions.

2. Run the following commands in sequence in the terminal to install the AWS service client modules and third-party modules listed in the *package.json*:

```
npm install node -g
npm install
```
## Building the code
This app runs from the browser, so we create the interface using HTML and CSS. 
The app uses JavaScript to provide basic interactive features, and Node.js to invoke the AWS Services.

### Creating the HTML and CSS
In **index.html**, the **head** section invoke the **recorder.css**, which applies styles to the HTML,
and the **index.js**, which contains JavaScript and Node.js functions used in the app.

Each button on the interface invokes one of these functions when clicked.

### Creating the JavaScript and Node.js
The **./src/libs/** folders contains a file for each of the AWS Service clients required. In the **awsID.js** file, you must
replace "REGION" with your AWS Region (e.g. us-west-2), and replace "IDENTITY_POOL_ID" with the Amazon Cognito identity pool id you created in [Create the resources](#create-the-resources) on this page.

**./src/index.js** imports all the required AWS Service and third party modules and contains the UI logic of the app.

Note: When using the app, make sure you use an email address you verified on Amazon SES in [Create the resources](#create-the-resources) on this page. 

**Important**: You must bundle all the JavaScript and Node.js code required for the app into a single
 file (**main.js**) to run the app.

### Bundling the scripts
This is a static site consisting only of HTML, CSS, and client-side JavaScript. 
However, a build step is required to enable the modules to work natively in the browser.

To bundle the JavaScript and Node.js for this example in a single file named main.js, 
enter the following commands in sequence in the AWS CLI command line:

```
cd javascriptv3/example_code/cross-services/transcribe-streaming-app/
npm run build
```
This will create a minified js file called **main.js** in the src folder.
## Run the app
Open the index.html in src in your favorite browser, and follow the onscreen instructions.

## Destroying the resources
4. Open [AWS CloudFormation in the AWS Management Console](https://aws.amazon.com/cloudformation/), and open the *Stacks* page.

![ ](images/cloud_formation_stacks.png)

5. Select the stack you created in [Create the resources](#create-the-resources) on this page.

6. Choose **Delete**.
