import { drive_v3 as drive, auth, drive_v3 } from "@googleapis/drive";
import { DriveFile, DriveFileType } from "./driveFile";
import {
  pathExists
} from "../util/function";

import type { Credentials } from "../types/types";



/**
 * @description The client to interact with the google drive api
 * @constructor 
 * @example
 * const driveClient = new DriveClient(authKey);
 * await driveClient.authorize();
 * let id = "1roGNlzS6RMJsn8sm1CpfGdh0KTdso9Ko";
 * let folder = await driveClient.getFileInfo(id);
 * if (folder) console.log(folder.name);
 */
class DriveClient {
  private authKey: Credentials;
  private _googleDriveClient: drive.Drive | null;

  constructor(authKey: Credentials) {
    this.authKey = authKey;
    this._googleDriveClient = null;
  }


  /**
   * @description Authorize the client
   * @returns The jwt client
   */
  public async authorize() {
    const scopes = [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata",
    ]
    const jwtClient = new auth.JWT(
      this.authKey.client_email,
      undefined,
      this.authKey.private_key,
      scopes

    );

    await jwtClient.authorize();
    this._googleDriveClient = new drive.Drive({
      auth: jwtClient,
    });

    return jwtClient;
  }



  /**
   * 
   * @param id The id of the file to get the sub files
   * @returns  The sub files of the file
   */
  public async getSubFiles(
    id: string,
  ): Promise<
    DriveFile[]
  > {
    let response = await this._googleDriveClient?.files
      .list({
        q: `'${id}' in parents`,
        fields: "files(id, name, mimeType,size,parents)",
        supportsAllDrives: true,
        supportsTeamDrives: true,
        includeItemsFromAllDrives: true,
        includeTeamDriveItems: true,
        pageSize: 1000,
        orderBy: "name desc,modifiedTime",
      })
      .catch((err) => null);
    if (!response?.data.files) return [];
    let files: DriveFile[] = response.data.files.map((fileData) => new DriveFile(this, fileData)) || [];


    await Promise.all(files.map(async (file) => await file.loadSubFiles()))

    return files;

  }
  /**
   * 
   * @param id The id of the file to get the details
   * @returns  The details of the file
   */
  public async getFileInfo(
    id: string,
  ): Promise<
    DriveFile | null
  > {
    let response = await this._googleDriveClient?.files
      .get({
        fileId: id,
        fields: "id, name, mimeType, size,parents",
        supportsAllDrives: true,
        supportsTeamDrives: true,
      })
      .catch((err) => null);
    let fileData = response?.data

    if (!fileData) return null;

    let file = new DriveFile(this, fileData)


    await file.loadSubFiles();



    return file;
  }
  /**
   * 
   * @param id The id of the file to get the shortcut details
   * @returns  The shortcut details of the file
   */
  public async getShortcutDetails(
    id: string,
  ): Promise<
    drive_v3.Schema$File["shortcutDetails"] | null
  > {
    let response = await this._googleDriveClient?.files
      .get({
        fileId: id,
        fields: "shortcutDetails",
        supportsAllDrives: true,
        supportsTeamDrives: true,
      })
      .catch((err) => null);
    return response?.data?.shortcutDetails || null;
  }




  /**
   * 
   * @param id The id of the file to download
   * @returns  The buffer of the file
   */
  async downloadFileBuffer(id: string): Promise<Buffer | null> {
    let response = await this._googleDriveClient?.files.get(
      {
        fileId: `${id}`,
        alt: "media",

        supportsAllDrives: true,
        supportsTeamDrives: true,
      },
      { responseType: "arraybuffer" }
    ).catch(err => null);

    if (!response) return null;
    return Buffer.from(response.data as ArrayBuffer);

  }
  /**
   * 
   * @param id The id of the file to download
   * @returns The readable stream of the file
   */
  async downloadFileStream(id: string): Promise<NodeJS.ReadableStream | null> {
    let response = await this._googleDriveClient?.files.get(
      {
        fileId: `${id}`,
        alt: "media",

        supportsAllDrives: true,
        supportsTeamDrives: true,
      },
      { responseType: "stream" }
    ).catch(err => null);

    if (!response) return null;
    return response.data;

  }


  /**
   * 
   * @param {DriveFile} drive  The drive file to build
   * @param {string} rootDir The root directory to build the drive in
   * @description Builds the drive in the local directory 
   * @returns 
   */
  async buildLocalDrive(drive: DriveFile, rootDir: string): Promise<boolean> {

    let rootPathExists = await pathExists(rootDir, true);//create the root path if it doesn't exist


    if (!rootPathExists) return false;


    let folderPath = `${rootDir}/${drive.name}`
    let folderExists = await pathExists(folderPath, true); //create the folder path if it doesn't exist
    if (!folderExists) return false;
    if (!drive.files) return true;
    let downloadedAllFiles = true;

    for (let file of drive.files) {
      let filePath = `${folderPath}/${file.fullName}`;

      let fileExists = await pathExists(filePath, false); //check if the file exists

      if (fileExists && file.type == DriveFileType.File) continue; //skip if the file exists


      if (file.type === DriveFileType.Folder) {
        downloadedAllFiles = await this.buildLocalDrive(file, folderPath); //recursively build the folder
      } else if (file.type === DriveFileType.File) {
        downloadedAllFiles = await file.downloadToPath(folderPath); //download the file
      }

    }

    return downloadedAllFiles;

  }


}

export default DriveClient;
export { DriveClient };