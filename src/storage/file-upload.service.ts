import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';
import { FileUploadMapping } from './storage.types';

@Injectable()
export class FileUploadService {
  constructor(private readonly storageService: StorageService) {}

  async uploadFilesWithCleanup<T>(
    fileMapping: FileUploadMapping[],
    operation: () => Promise<T>,
  ): Promise<T> {
    const keysForCleanup: string[] = [];

    try {
      for (const mapping of fileMapping) {
        if (!mapping.file) continue;
        await this.storageService.uploadFile(mapping.file, mapping.key);
        keysForCleanup.push(mapping.key);
      }
      return await operation();
    } catch (error) {
      await this.storageService.deleteFiles(keysForCleanup);
      throw error;
    }
  }
}
