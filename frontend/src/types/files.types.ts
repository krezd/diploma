export interface FileInfo {
  fileName: string;
  fileSize: number | null;
  fileType: 'FILE' | 'DIRECTORY';
  filePath: string;
  lastModified: string;
}