import { access } from "fs/promises";
import type { DriveFile } from "../base/driveFile";
export function pathExists(path: string): Promise<boolean> {
    return access(path)
        .then(() => true)
        .catch(() => false);
}


export function formatSize(size: number): string {
    let sizes = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (size >= 1024) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(2)} ${sizes[i]}`;
}

export function unformatSize(size: string): number {
    let sizes = ["B", "KB", "MB", "GB", "TB"];

    let number = Number(size.split(" ")[0]);
    let unit = size.split(" ")[1];
    let i = sizes.indexOf(unit)

    return Math.round(number * Math.pow(1024, i + 1))
}


export function calculateSize(files: DriveFile[]): number {
    let size = 0;
    for (let file of files) {

        if (file.files) size += calculateSize(
            file.files
        )
        else
            size += Math.round(file.size) || 0;
    }
    return Math.round(size);
}