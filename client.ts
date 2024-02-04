import { drive_v3 } from "@googleapis/drive";
import { google } from "googleapis";
import fs from "fs/promises";

export interface credentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

interface File {
  type: "folder" | "file";
  id: string | null;
  name: string | null;
  mimeType: string | null;
  size: number | null;
  files: (File | null)[] | null;
}
interface options {
  replaceShortcuts: boolean;
  loadSubFiles: boolean;
}

class Client {
  private authKey: credentials;
  private driveClient: drive_v3.Drive | null;

  constructor(authKey: credentials) {
    this.authKey = authKey;
    this.driveClient = null;
  }

  async authorize() {
    const jwtClient = new google.auth.JWT(
      this.authKey.client_email,
      undefined,
      this.authKey.private_key,
      [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.metadata",
      ]
    );

    await jwtClient.authorize();
    this.driveClient = google.drive({
      version: "v3",
      auth: jwtClient,
    });
    return jwtClient;
  }
  get drive() {
    return this.driveClient;
  }
  private _pathExists(path: string) {
    return fs
      .access(path)
      .then(() => true)
      .catch(() => false);
  }
  _formatSize(size: number): string {
    let sizes = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (size >= 1024) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(2)} ${sizes[i]}`;
  }
  _unformatSize(size: string): number {
    let sizes = ["B", "KB", "MB", "GB", "TB"];

    return +size.split(" ")[0] * 1024 ** sizes.indexOf(size.split(" ")[1]);
  }
  _CalculateSize(files: File[]): number {
    let size = 0;
    for (let file of files) {
      if (file.type == "folder")
        size += this._CalculateSize(
          (file.files?.filter((f) => f) as File[]) || []
        );
      else size += file.size || 0;
    }
    return size;
  }

  private async _getFile(
    id: string,
    options: options = { replaceShortcuts: false, loadSubFiles: true }
  ): Promise<(File | null)[]> {
    let response = await this.driveClient?.files
      .list({
        q: `'${id}' in parents`,
        fields: "files(id, name, mimeType,size,parents,shortcutDetails)",
      })
      .catch((err) => null);
    if (!response) return [];

    if (!response?.data?.files) throw new Error("Folder not found");

    let files: (File | null)[] = [];
    for (let fileData of response?.data?.files) {
      let isFolder = fileData?.mimeType?.includes("folder");
      let originalFileId = fileData?.shortcutDetails?.targetId;
      if (originalFileId && options.replaceShortcuts) {
        if (fileData?.parents?.includes(originalFileId)) continue;
        let originalFile = await this.getFileInfo(originalFileId, options);

        files.push(originalFile);
        continue;
      }
      let subFiles: (File | null)[] | null = isFolder
        ? await this._getFile(`${fileData.id}`, options)
        : null;

      let file: File = {
        type: isFolder ? "folder" : "file",
        id: fileData?.id || null,
        name: fileData?.name || null,
        size:
          isFolder && subFiles
            ? this._CalculateSize(subFiles.filter((f) => f) as File[])
            : Number(fileData?.size) || null,
        mimeType: fileData?.mimeType || null,
        files: isFolder ? subFiles : null,
      };
      files.push(file);
    }
    return files;
  }

  async getFileInfo(
    id: string,
    options: options = { replaceShortcuts: false, loadSubFiles: true }
  ): Promise<File | null> {
    let response = await this.driveClient?.files
      .get({
        fileId: id,
        fields: "id, name, mimeType, size,parents,shortcutDetails",
      })
      .catch((err) => null);
    if (!response) return null;
    let fileData = response?.data;
    let originalFileId = fileData?.shortcutDetails?.targetId;
    if (originalFileId && options.replaceShortcuts) {
      if (!fileData?.parents?.includes(originalFileId))
        return await this.getFileInfo(originalFileId, options);
      else console.log(`shortcut loop ${fileData?.name} ${originalFileId}`);
    }

    let isFolder = fileData?.mimeType?.includes("folder");

    let subFiles: (File | null)[] | null =
      isFolder && options.loadSubFiles
        ? await this._getFile(`${fileData?.id}`, options)
        : isFolder
        ? []
        : null;

    return {
      type: isFolder ? "folder" : "file",
      id: fileData?.id || null,
      name: fileData?.name || null,
      size: isFolder
        ? this._CalculateSize(subFiles?.filter((f) => f) as File[])
        : null,
      mimeType: fileData?.mimeType || null,
      files: subFiles,
    };
  }

  async downloadFile(file: File) {
    //if (file.type == "folder") return null;
    let response = await this.drive?.files.get(
      {
        fileId: `${file.id}`,
        alt: "media",
      },
      { responseType: "arraybuffer" }
    );

    let buffer = response?.data as WithImplicitCoercion<ArrayBuffer>; //
    return Buffer.from(buffer);
  }

  async buildLocalDrive(drive: File, path: string) {
    //check path is exists using fs/promises
    //if not exists create it
    let rootPathExists = await this._pathExists(path);

    if (!rootPathExists) await fs.mkdir(path);
    let folderPath = path + "/" + drive.name;
    let folderExists = await this._pathExists(folderPath);
    if (!folderExists) await fs.mkdir(folderPath);

    if (!drive.files) return;
    for (let file of drive.files.filter((f) => f) as File[]) {
      if (file.type == "folder") {
        await this.buildLocalDrive(file, folderPath);
        continue;
      }
      let filePath = folderPath + "/" + file.name;
      let fileExists = await this._pathExists(filePath);
      if (fileExists) continue;
      let buffer = await this.downloadFile(file);
      fs.writeFile(filePath, buffer).catch((err) => {
        console.log("err " + file.name);
      });
    }
  }
}

export default Client;
export { Client };