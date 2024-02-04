
import { Client } from "./client";
import credentials from "./credentials.json";



async function main() {
  let client = new Client(credentials);
  await client.authorize();

  let id = "folder_id";

  console.log("Getting file info");
  let file = await client.getFileInfo(id, {
    replaceShortcuts: true,
    loadSubFiles: true,
  });
  if (!file) throw new Error("File not found");
  console.log("Building local drive");
  await client.buildLocalDrive(file, process.cwd() + "\\drive");

  return;
}
main();
