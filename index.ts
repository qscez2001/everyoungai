import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    
    try {
        const name = getNameFromQueryParameters(event);
        const data = await fetchOpenAICompletion(name);
        const content = data.choices[0].message.content;

        if (content.includes("not in")) {
            return { statusCode: 200, body: JSON.stringify({ error: "not found." }) };
        }

        const extractedName = parseNameFromContent(content);

        return { statusCode: 200, body: JSON.stringify({ name: extractedName }) };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

};

const getNameFromQueryParameters = (event: APIGatewayEvent): string => {
    const name = event.queryStringParameters?.name;
    if (typeof name !== 'string') {
        throw new Error('Name must be a string and cannot be empty.');
    }
    return name;
};

const parseNameFromContent = (content: string): string => {
    const nameMatch = content.match(/"([^"]+)"/);
    return nameMatch ? nameMatch[1] : "not found";
};

async function fetchOpenAICompletion(name: string) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4",
            seed: 0,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant. Find if the user input name is in the list. If it's, return the list item in string"
                },
                {
                    role: "user",
                    content: `${name} or similar name in the list \n[\"David Smith 大卫 斯密斯\", \"Yueling Zhang 月林张\", \"Huawen Wu 华文吴\", \"Annie Lee 李安妮\"]`
                }
            ]
        })
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(`Error from OpenAI: ${response.status} ${response.statusText} - ${errorDetails}`);
    }

    const data = await response.json();
    return data;
}
