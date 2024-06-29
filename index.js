import MistralClient from '@mistralai/mistralai';
import { config } from 'dotenv';

config();

const apiKey = process.env.MISTRAL_API_KEY;
const client = new MistralClient(apiKey)

const chatResponse = await client.chat({
    model: 'mistral-tiny',
    messages: [{role: 'user', content: 'What is the best French cheese?'}],
});

console.log(chatResponse.choices[0].message.content);