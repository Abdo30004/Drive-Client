import mime from "mime";
import type { drive_v3 as drive } from "@googleapis/drive";
import type { DriveClient } from "./driveClient";
import { calculateSize, formatSize, unformatSize } from "../util/function";


class DriveFile {

    public type: "folder" | "file";
    public id: string;
    public name: string | null;
    public mimeType: string | null;
    public files: DriveFile[] | null;
    public size: number;
    public formatedSize: string;

    public extension: string | null;
    #_driveClient: DriveClient; // I'm using # to indicate private fields , I chose this because it will hide it from logging

    constructor(
        driveClient: DriveClient,
        fileData: drive.Schema$File,
    ) {
        this.#_driveClient = driveClient;
        this.type = fileData.mimeType === "application/vnd.google-apps.folder" ? "folder" : "file";
        this.id = `${fileData.id}`
        this.name = fileData.name || null;
        this.mimeType = fileData.mimeType || null;
        this.files = null;

        this.size = this.files ? calculateSize(this.files) : unformatSize(fileData.size || "0");
        this.formatedSize = formatSize(this.size);
        this.extension = this.mimeType ? mime.getExtension(this.mimeType) : null;


    }





    async loadSubFiles() {
        if (this.type === "file") return;
        if (this.files?.length) return;

        this.files = await this.#_driveClient.getSubFiles(this.id);
        this.size = calculateSize(this.files);
        this.formatedSize = formatSize(this.size);
    }

    async downloadBuffer(): Promise<Buffer | null> {
        if (this.type === "folder") return null;

        return this.#_driveClient.downloadFileBuffer(this.id);
    }

    async downloadStream() {
        if (this.type === "folder") return null;

        return this.#_driveClient.downloadFileStream(this.id);
    }



}

export { DriveFile };
