import { STSClient } from "@aws-sdk/client-sts";
import { AssumeRoleCommand } from "@aws-sdk/client-sts";
// Set the AWS Region.
const REGION = "us-east-1";
// Create an AWS STS service client object.
export const client = new STSClient({ region: REGION });

export async function handler(event) {

  try {
    // Returns a set of temporary security credentials that you can use to
    // access Amazon Web Services resources that you might not normally 
    // have access to.
    const command = new AssumeRoleCommand({
      // The Amazon Resource Name (ARN) of the role to assume.
      RoleArn: process.env.pollyRole,
      // An identifier for the assumed role session.
      RoleSessionName: "session",
      // The duration, in seconds, of the role session. The value specified
      // can range from 900 seconds (15 minutes) up to the maximum session 
      // duration set for the role.
      DurationSeconds: 900,
    });
    const response = await client.send(command);
    console.log(response);
    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response.Credentials),
      statusCode: 200,
    };
  } catch (err) {
    console.error(err);
    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(err),
      statusCode: 200,
    };
  }
}
