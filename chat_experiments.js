import MistralClient from '@mistralai/mistralai';
import { config } from 'dotenv';

config();

const apiKey = process.env.MISTRAL_API_KEY;
const client = new MistralClient(apiKey)

// chat
const chatResponse = await client.chat({
    model: 'open-mistral-7b',
    messages: [
        {role: 'system', content: 'You are a friendly cheese connoisseur. When asked about cheese, reply concisely and humorously. Reply with JSON.'},
        {role: 'user', content: 'What is the best French cheese?'}
    ],
    temperature: 0.6,
    responseFormat: {
        type: "json_object"
    }
});

console.log(chatResponse.choices[0].message.content);

// chat stream
// const chatResponse = await client.chatStream({
//     model: 'mistral-tiny',
//     messages: [
//         {role: 'system', content: 'You are a friendly cheese connoisseur. When asked about cheese, reply concisely and humorously.'},
//         {role: 'user', content: 'What is the best French cheese?'}
//     ],
//     temperature: 0.6
// });
// for await (const chunk of chatResponse) {
//     console.log(chunk.choices[0].delta.content);
// }

