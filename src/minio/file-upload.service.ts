import {
  Global,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { MinioService } from 'src/minio/minio.service';
import { MemoryStoredFile } from 'nestjs-form-data';
import { GetMinioFileDto } from 'src/minio/_utils/dto/response/get-minio-file.dto';
import { ErrorCodes } from '../_utils/enums/error-codes.enum';

interface FileUploadMapping {
  file?: MemoryStoredFile;
  key: string;
}

@Global()
@Injectable()
export class FileUploadService {
  constructor(private readonly minioService: MinioService) {}

  async uploadFilesWithCleanup<T>(
    fileMapping: FileUploadMapping[],
    operation: (uploadedFiles: Record<string, GetMinioFileDto>) => Promise<T>,
  ): Promise<T> {
    const filesToUpload = fileMapping.filter((mapping) => mapping.file);
    const keysForCleanup: string[] = [];

    try {
      const uploadedFiles: Record<string, GetMinioFileDto> = {};

      for (const mapping of filesToUpload) {
        if (!mapping.file) {
          continue;
        }

        const uploadedFile = await this.minioService.uploadFile(
          mapping.file,
          mapping.key,
        );

        if (!uploadedFile) {
          throw new InternalServerErrorException(ErrorCodes.FILE_UPLOAD_FAILED);
        }

        uploadedFiles[mapping.key] = uploadedFile;
        keysForCleanup.push(mapping.key);
      }

      const result = await operation(uploadedFiles);
      return result;
    } catch (error) {
      if (keysForCleanup.length > 0) {
        await this.minioService.deleteFiles(keysForCleanup);
      }
      throw error;
    }
  }
}
