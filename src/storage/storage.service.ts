import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { MemoryStoredFile } from 'nestjs-form-data';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { STORAGE_CLIENT_TOKEN } from 'src/_utils/constants';

@Injectable()
export class StorageService {
  private readonly bucket: string;

  constructor(
    @Inject(STORAGE_CLIENT_TOKEN) private readonly client: S3Client,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.bucket = configService.get('STORAGE').STORAGE_BUCKET;
  }

  async uploadFile(file: MemoryStoredFile, key: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
  }

  async deleteFiles(keys: string[]): Promise<void> {
    if (!keys.length) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  }
}
