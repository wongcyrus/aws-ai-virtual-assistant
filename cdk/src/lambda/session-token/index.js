export async function handler(event) {



  return {
    body: JSON.stringify({ message: completion.data.choices[0].text }),
    statusCode: 200,
  };
}
