import fs from 'node:fs';
import { config } from 'dotenv';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

config();

const localPath = process.env.LOCAL_PATH;

function extractFileName(path) {
    try {
        return path.split('/').pop().split('.')[0];
    } catch (err) {
        console.error(`File name could not be extracted: ${err.message}`);
        return null;
    }
}

function readFileContents(path) {
    try {
        return fs.readFileSync(path, 'utf8');
    } catch (err) {
        console.error(`Error reading the file: ${err.message}`);
        throw err;
    }
}

function getObsidianDocument(path) {
    const fileName = extractFileName(path) || 'Unknown';
    const fileContents = readFileContents(path);
    
    return `${fileName}\n\n${fileContents}`;
}

async function chunkText(text) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 250,
        chunkOverlap: 40
    });
    const output = await splitter.createDocuments([text]);
    return output
}

const path = localPath;
const documentContent = getObsidianDocument(path);
const chunkedText = await chunkText(documentContent);
console.log(chunkedText);
