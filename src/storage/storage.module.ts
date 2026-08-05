import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileUploadService } from './file-upload.service';
import { StorageMapper } from './storage.mapper';
import { storageProviders } from './storage.provider';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    StorageService,
    StorageMapper,
    FileUploadService,
    ...storageProviders,
  ],
  exports: [StorageService, StorageMapper, FileUploadService],
})
export class StorageModule {}
