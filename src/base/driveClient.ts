import { drive_v3 as drive, auth, drive_v3 } from "@googleapis/drive";
import { DriveFile } from "./driveFile";







class DriveClient {
  private authKey: credentials;
  private _googleDriveClient: drive.Drive | null;

  constructor(authKey: credentials) {
    this.authKey = authKey;
    this._googleDriveClient = null;
  }

  async authorize() {
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

  get drive() {
    return this._googleDriveClient;
  }


  public async getSubFiles(
    id: string,
  ): Promise<
    DriveFile[]
  > {
    let response = await this._googleDriveClient?.files
      .list({
        q: `'${id}' in parents`,
        fields: "files(id, name, mimeType,size,shortcutDetails)",
        supportsAllDrives: true,
        supportsTeamDrives: true,
        includeItemsFromAllDrives: true,
        includeTeamDriveItems: true,
        pageSize: 1000,
        orderBy: "name desc,modifiedTime",
      })
      .catch((err) => null);

    let files: DriveFile[] = response?.data.files?.map((fileData: drive_v3.Schema$File) => new DriveFile(this, fileData)) || [];
    await Promise.all(files.map(async (file) => await file.loadSubFiles()))

    /*
        for (let file of files) {
          await file.loadSubFiles(this);
        }*/

    return files;

  }

  public async getFileInfo(
    id: string,
  ): Promise<
    DriveFile | null
  > {
    let response = await this._googleDriveClient?.files
      .get({
        fileId: id,
        fields: "id, name, mimeType, size,parents,shortcutDetails",
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
  async downloadFileBuffer(id: string): Promise<Buffer | null> {
    let response = await this.drive?.files.get(
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

  async downloadFileStream(id: string): Promise<NodeJS.ReadableStream | null> {
    let response = await this.drive?.files.get(
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





}

export default DriveClient;
export { DriveClient };