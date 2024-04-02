import credentials from "./secrets/credentials.json"
import { createWriteStream } from "fs";
import { DriveClient } from "./base/driveClient";


async function main() {
    let client = new DriveClient(credentials);
    await client.authorize();
    let id = "folderId";
    let folder = await client.getFileInfo(id);
    if (!folder) return console.log("Folder not found")
    console.log(folder.name, folder.files?.length)

}

main();