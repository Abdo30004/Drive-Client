
import mime from "mime";
import { writeFile } from "fs/promises";
import { createWriteStream } from "fs";
import { calculateSize, formatSize, unformatSize, pathExists, createProgressBar, waitForEnd } from "../util/function";
import type { DriveClient } from "./driveClient";
import { DriveFileType, DriveFileMimeType, RawFileData } from "../types/types";


/**
 * @description  Represents a file in the google drive
 * @example
 * const driveClient = new DriveClient(authKey);
 * await driveClient.authorize();
 * let file=new DriveFile(driveClient,fileData); //fileData is the file data from the google drive api
 */
class DriveFile {
    /**
     * @description  Type of the file, it can be a folder or a file or a shortcut
     * @example "folder"
     */
    public type: DriveFileType;
    /**
     * @description  Unique identifier of the file
     * @example "1N9FbjYAJ2diTP4k1rsD9_IImlS4aHHpu"
     */
    public id: string;
    /**
     * @description  Name of the file
     * @example "My Folder"
     */
    public name: string | null;
    /**
     * @description  List of sub files if the file is a folder
     * @example [DriveFile,DriveFile,DriveFile]
     */
    public files: DriveFile[] | null;
    /**
     * @description  Size of the file in bytes
     * @example 1234567
     */
    public size: number;


    /**
    * @description  List of sub files if the file is a folder
    * @example "application/pdf"
    */
    public mimeType: string | null;

    /**
    * @description  Formated size of the file
    * @example 1.2 MB
    */
    public formatedSize: string;


    /**
     * @description  Extension of the file
     * @example mp4
     */
    public extension: string | null;


    #_driveClient: DriveClient; // I'm using # to indicate private fields , I chose this because it will hide it from logging



    /**
     * @description  Create a new DriveFile instance 
     * @param {DriveClient} driveClient 
     * @param {RawFileData} fileData 
     */
    constructor(
        driveClient: DriveClient,
        fileData: RawFileData,
    ) {
        this.#_driveClient = driveClient; //The drive client instance to use for operations (loading sub files, downloading file etc..)


        //Determine the type of the file
        if (fileData.mimeType === DriveFileMimeType.Folder) this.type = DriveFileType.Folder;
        else if (fileData.mimeType === DriveFileMimeType.Shortcut) this.type = DriveFileType.Shortcut;
        else this.type = DriveFileType.File;


        this.id = `${fileData.id}` //Unique identifier of the file

        this.name = fileData.name || null; //Name of the file

        this.files = null;  //List of sub files if the file is a folder , it will be loaded later

        if (this.type === DriveFileType.Folder) {
            //If the file is a folder, the size will be calculated later (after loading sub files)
            this.size = 0;
            this.formatedSize = formatSize(this.size);
        }
        else {
            this.size = fileData.size ? unformatSize(fileData.size) : 0;
            this.formatedSize = formatSize(this.size);
        }


        this.mimeType = fileData.mimeType || null; //Mime type of the file
        this.extension = this.mimeType ? mime.getExtension(this.mimeType) : null;


    }



    /**
     * @method loadSubFiles
     * @description Load sub files of the current file if it's a folder and store them in the files property
     * @returns Promise<Boolean>
     */

    async loadSubFiles(): Promise<Boolean> {
        if (this.type === DriveFileType.File) return false;
        this.files = await this.#_driveClient.getSubFiles(this.id);
        this.size = calculateSize(this.files);
        this.formatedSize = formatSize(this.size);
        return true;
    }

    async getOriginalFile(): Promise<DriveFile | null> {
        if (this.type !== DriveFileType.Shortcut) return null;

        let shortcutDetails = await this.#_driveClient.getShortcutDetails(this.id);
        if (!shortcutDetails || !shortcutDetails.targetId) return null

        let originalFile = await this.#_driveClient.getFileInfo(shortcutDetails.targetId);
        if (!originalFile) return null;

        return originalFile

    }

    get isFolder(): boolean {
        return this.type === DriveFileType.Folder;
    }

    get isFile(): boolean {
        return this.type === DriveFileType.File;
    }

    get isShortcut(): boolean {
        return this.type === DriveFileType.Shortcut;
    }

    get fullName(): string {
        let extension = this.extension ? `.${this.extension}` : "";
        return `${this.name}${extension}`;
    }





    /**
     * @method downloadBuffer
     * @description Download the file by returning a buffer
     * @returns Promise<Buffer | null>
     */
    async downloadBuffer(): Promise<Buffer | null> {
        if (this.type === DriveFileType.Folder) return null;

        return this.#_driveClient.downloadFileBuffer(this.id);
    }

    /**
     * @method downloadStream
     * @description Download the file by returning a readable stream
     * @returns Promise<Readable | null>
     */

    async downloadStream(): Promise<NodeJS.ReadableStream | null> {
        if (this.type === DriveFileType.Folder) return null;

        return this.#_driveClient.downloadFileStream(this.id);
    }


    /**
     * @method downloadToPath
     * @description Download the file to a specific path (directory)
     * @param {string} outDir - The path to download the file to
     * @param {string} alternativeName - The name of the file to be saved as
     * @returns Promise<boolean>
        */
    async downloadToPath(outDir: string, alternativeName?: string): Promise<boolean> {
        if (this.type !== DriveFileType.File) return false;

        let exists = await pathExists(outDir, true);

        if (!exists) return false;


        let fileName = alternativeName || this.fullName;
        let filePath = `${outDir}/${fileName}`;



        /*
        let buffer = await this.downloadBuffer();
        if (!buffer) return false;


        let downloaded = await writeFile(filePath, buffer).then(() => true).catch((err) => {
            console.log(err)
            return false;
        });*/



        let stream = await this.downloadStream();
        if (!stream) return false;

        let file = createWriteStream(filePath);
        createProgressBar(stream, this.size);
        stream.pipe(file);


        let downloaded = await waitForEnd(stream).then(() => true).catch(() => false);
        return downloaded;

    }






}

export { DriveFile, DriveFileType, DriveFileMimeType }
