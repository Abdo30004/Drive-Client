


import type { drive_v3 as drive } from "@googleapis/drive";
interface Credentials {
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




enum DriveFileType {
    Folder = "folder",
    File = "file",
    Shortcut = "shortcut",
}

enum DriveFileMimeType {

    Folder = "application/vnd.google-apps.folder",
    Shortcut = "application/vnd.google-apps.shortcut",
}

interface RawFileData extends drive.Schema$File {
}


export { Credentials, DriveFileType, DriveFileMimeType, RawFileData }