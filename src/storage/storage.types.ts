import { MemoryStoredFile } from 'nestjs-form-data';

export interface FileUploadMapping {
  file?: MemoryStoredFile;
  key: string;
}
