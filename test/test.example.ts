import { DriveClient } from '../src/index';
import credentials from './secrets/credentials.json'; // You need to create a credentials.json file with your google drive api credentials


async function test() {
    const client = new DriveClient(credentials);
    await client.authorize();
    const fileId = "fileId"

    let file = await client.getFileInfo(fileId);
    if (!file) return;

    console.log("File: ", file.name);
}



test();