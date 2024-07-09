import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import similarity from 'compute-cosine-similarity';

const apiKey = process.env.OPENAI_API_KEY;

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    
    const usernames: string[] = ["David Smith 大卫 斯密斯", "Yueling Zhang 月林张", "Huawen Wu 华文吴", "Annie Lee 李安妮"];

    const model = "text-embedding-ada-002";    


    let usernames_embeds: any[] = [];
    let query_embed: any[] = [];
    let name: string | undefined;

    if (event.queryStringParameters && event.queryStringParameters.name) {
        name = event.queryStringParameters.name;
    }

    if (typeof name !== 'string') {
        throw new Error('name must be a string');
    }

    try {
        const resp = await fetchEmbeddings({
            input: name,
            model: model
        });
        query_embed = resp.data[0].embedding;

    } catch (error) {
        console.error('Error fetching embeddings:', error);
    }

    try {
        const resp = await fetchEmbeddings({
            input: usernames,
            model: model
        });

        usernames_embeds = await getEmbeddingsList(resp);

    } catch (error) {
        console.error('Error fetching embeddings:', error);
    }

    let index = 0;
    try {
        let scores: number[] = [];
        for (let i = 0; i < usernames_embeds.length; i++) {
            // const score = similarity(query_embed, usernames_embeds[i]);
            const score = await calculateSimilarityAsync(query_embed, usernames_embeds[i]);
            scores.push(score as number); // Store the score
        }

        const maxScore = Math.max(...scores);
        index = scores.indexOf(maxScore);

    } catch (error) {
        console.error('Error calculate similarities:', error);
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            name: usernames[index]
        }),
    };
};

async function getEmbeddingsList(responseData: any): Promise<number[][]> {
    let embeddings: number[][] = [];
    responseData.data.forEach((item) => {
        const embedding = item.embedding;
        embeddings.push(embedding);
      });
    return embeddings;
}

async function fetchEmbeddings(requestData: any): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestData)
    });

    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(`Error: ${response.status} ${response.statusText} - ${errorDetails}`);
    }

    return response.json();
}

async function calculateSimilarityAsync(query_embed: number[], user_embed: number[]): Promise<number> {
    const score = similarity(query_embed, user_embed);
    if (score === null) {
        return Promise.resolve(0); 
    }
    return Promise.resolve(score);
}
