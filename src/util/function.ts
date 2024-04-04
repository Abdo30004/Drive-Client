import { access, mkdir } from "fs/promises";
import type { DriveFile } from "../base/driveFile";
export async function pathExists(path: string, create = false): Promise<boolean> {
    let exists = await access(path).then(() => true).catch(() => false);

    if (!exists && create) {
        exists = await mkdir(path, { recursive: true }).then(() => true).catch(() => false);
    }

    return exists;
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


export function createProgressBar(stream: NodeJS.ReadableStream, totalSize: number) {
    const width = 50;
    const totalBlocks = width - 10;
    let transferredBytes = 0;


    /*
        process.stdout.write('[');
        process.stdout.write(' '.repeat(totalBlocks));
        process.stdout.write('] 0%');
    */
    stream.on('data', (chunk) => {
        transferredBytes += chunk.length;
        const percentage = Math.floor((transferredBytes / totalSize) * 100);
        const completedBlocks = Math.floor((transferredBytes / totalSize) * totalBlocks);
        const remainingBlocks = totalBlocks - completedBlocks;

        process.stdout.clearLine(1);
        process.stdout.cursorTo(0);
        process.stdout.write('[');
        process.stdout.write('='.repeat(completedBlocks));
        process.stdout.write(' '.repeat(remainingBlocks));
        process.stdout.write('] ' + percentage + '%');

        process.stdout.write(` ${formatSize(transferredBytes)}/${formatSize(totalSize)}`);

        if (transferredBytes === totalSize) {
            process.stdout.write('\n');
        }
    })

}




export function waitForEnd(stream: NodeJS.ReadableStream): Promise<boolean> {
    return new Promise((resolve, reject) => {
        stream.on('end', () => resolve(true));
        stream.on('error', () => reject(false));
    });
}