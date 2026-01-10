export class GetMinioFileDto {
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export class GetFileDto {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}
