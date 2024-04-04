# Drive Client V2

## Introduction

This is a simple client for Google Drive.It gets the list of files and folders in the root directory of the drive and also downloads the files from the drive to the local directory with the same directory structure.

## Usage

```typescript
import { DriveClient } from "drive-client";
import credentials from "./credentials.json"; // Google Drive API credentials (or use fs to read the file)

async function main() {
  const client = new DriveClient(credentials);
  await client.authorize();
  const fileId = "fileId";

  let file = await client.getFileInfo(fileId);
  if (!file) return;

  console.log("File: ", file.name);
}

main();
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
