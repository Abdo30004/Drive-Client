import { DriveClient } from '../index';
import credentials from './secrets/credentials.json'; // You need to create a credentials.json file with your google drive api credentials


async function test() {
    const client = new DriveClient(credentials);
    await client.authorize();
    let fileId = "fileId"; // The id of the file you want to download
    let file = await client.getFileInfo(fileId);
    if (!file) return console.log("File not found");

    await file.downloadToPath("./downloads");// Download the file to the downloads folder 




}



test();