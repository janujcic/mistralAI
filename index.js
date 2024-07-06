import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import MistralClient from '@mistralai/mistralai';
import { createClient } from '@supabase/supabase-js'
import { table } from 'node:console';


config();

const mistralApiKey = process.env.MISTRAL_API_KEY;
const supabaseApiKey = process.env.SUPABASE_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const localPath = process.env.LOCAL_PATH;
const supabaseTable = process.env.SUPABASE_TABLE;

const mistralClient = new MistralClient(mistralApiKey)
const supabaseClient = createClient(supabaseUrl, supabaseApiKey);

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

function getAllFilePaths(folderPath, fileType, fileList=[]) {
    const filesAndFolders = fs.readdirSync(folderPath);

    filesAndFolders.forEach(item => {
        const fullPath = path.join(folderPath, item);
        const stat = fs.statSync(fullPath);

        // If the item is a directory, recursively get its file paths
        if (stat.isDirectory()) {
            getAllFilePaths(fullPath, fileType, fileList);
        } else if (stat.isFile() && path.extname(fullPath) === fileType) {
            // If the item is a file and matches the file type, add it to the list
            fileList.push(fullPath);
        }
    });
    return fileList;

}

function getAllObsidianFiles(path, ignoreFolder=".trash") {
    const allFilePaths = getAllFilePaths(path, ".md");
    const obsidianFilePaths = allFilePaths.filter(filePath => !filePath.includes(ignoreFolder));
    let obsidianDocs = [];
    obsidianFilePaths.forEach(filePath => {
        const content = getObsidianDocument(filePath);
        const fileName = extractFileName(filePath);
        const obsidianFile = {"name":fileName, "content":content};

        obsidianDocs.push(obsidianFile);
    });
    return obsidianDocs;

}

async function chunkText(text) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 40
    });
    const output = await splitter.createDocuments([text]);
    const textArray = output.map(chunk => chunk.pageContent);
    return textArray;
}

async function createEmbedding(text) {
    const embeddingsResponse = await mistralClient.embeddings({
        model: 'mistral-embed',
        input: text
    });
    return embeddingsResponse.data[0].embedding;
}

async function embedChunks(textChunks) {
    const embeddingsResponse = await mistralClient.embeddings({
        model: 'mistral-embed',
        input: textChunks
    });
    const embeddings = embeddingsResponse["data"].map(embedding => embedding.embedding);
    const embeddingChunks = embeddings.map((value, index) => {
       return {"content":textChunks[index], "embedding":value};
    });
    return embeddingChunks;

}

async function insertDataSupabase(data, table) {
    await supabaseClient.from(table).insert(data);
    console.log("Upload to supabase complete!");
}

async function uploadChunksToVectorDatabase(path) {
    const documentContent = getObsidianDocument(path);
    const chunks = await chunkText(documentContent);
    const embeddedChunks = await embedChunks(chunks);
    insertDataSupabase(embeddedChunks, supabaseTable);
}

async function uploadObsidianChunksToVectorDB(path, table) {
    const obsidianFiles = getAllObsidianFiles(path);
    console.log("Obsidian files retrieved: " + obsidianFiles.length);
    let embeddedObsidianFiles = [];
    for (const file of obsidianFiles) {
        const chunks = await chunkText(file["content"]);
        let embeddedChunks = await embedChunks(chunks);
        embeddedChunks = embeddedChunks.map(chunk => {
            chunk["document"] = file["name"]
            return chunk;
        });
        embeddedObsidianFiles = embeddedObsidianFiles.concat(embeddedChunks);
    }
    insertDataSupabase(embeddedObsidianFiles, table);
}

async function mistralChat(systemInstr, userInstr, model="open-mixtral-8x7b", temp=0.6, responseFormat="json_object") {
    const chatResponse = await mistralClient.chat({
        model: model,
        messages: [
            {role: 'system', content: systemInstr},
            {role: 'user', content: userInstr}
        ],
        temperature: temp,
        responseFormat: {
            type: responseFormat
        }
    });
    return chatResponse;
}


async function retrieveMatches(embedding) {
    const { data } = await supabaseClient.rpc('match_obsidian_docs', {
        query_embedding: embedding, // Pass the embedding you want to compare
        match_threshold: 0.75, // Choose an appropriate threshold for your data
        match_count: 5, // Choose the number of matches
    });
    return data.map(chunk => chunk.content).join(" ");
}

async function mistralAnswer(input) { 
    const inputEmbedding = await createEmbedding(input);
    const contextData = await retrieveMatches(inputEmbedding);
    
    const context = "Additional information to be used when answering the question: \n" + contextData; 
    console.log(context);
    const mistralAnswer = await mistralChat("Answer the question using the provided additional information before the question.",  context + "\n" + input);
    console.log(mistralAnswer.choices[0]);
    console.log(mistralAnswer.choices[0].message.content);
}

//uploadObsidianChunksToVectorDB(localPath, supabaseTable);

const input = "How can I get out of a rut? How can I feel better and less anxious about all the problems currently in the world?"

mistralAnswer(input);