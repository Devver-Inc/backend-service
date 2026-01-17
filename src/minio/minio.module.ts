import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MINIO_CLIENT_TOKEN } from 'src/_utils/constants';
import { FileUploadService } from 'src/minio/file-upload.service';
import { MinioMapper } from './minio.mapper';
import { minioProviders } from './minio.provider';
import { MinioService } from './minio.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MinioService, MinioMapper, FileUploadService, ...minioProviders],
  exports: [MinioService, MinioMapper, FileUploadService, MINIO_CLIENT_TOKEN],
})
export class MinioModule {}
