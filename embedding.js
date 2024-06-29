import fs from 'node:fs';

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

const path = "/mnt/c/Users/jujcic/iCloudDrive/iCloud~md~obsidian/Zettelkasten/The blank sheet note-taking system.md";
const documentContent = getObsidianDocument(path);
console.log(documentContent);
