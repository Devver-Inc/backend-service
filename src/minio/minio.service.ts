import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { MemoryStoredFile } from 'nestjs-form-data';
import { EnvironmentVariables } from '../_utils/config/env.config';
import { MINIO_CLIENT_TOKEN } from '../_utils/constants';
import { MinioFile } from './minio-file.schema';

@Injectable()
export class MinioService {
  private readonly BUCKET_NAME: string;
  private readonly MINIO_PRESIGNED_URL_EXPIRATION_TIME = 3600;

  constructor(
    @Inject(MINIO_CLIENT_TOKEN) private readonly minioClient: Client,
    private configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.BUCKET_NAME = this.configService.get('MINIO').MINIO_BUCKET_NAME;
  }

  uploadFile = async (
    fileOrBuffer: MemoryStoredFile | Buffer,
    key: string,
    mimeType?: string,
    fileName?: string,
  ): Promise<MinioFile | undefined> => {
    const isBuffer = Buffer.isBuffer(fileOrBuffer);

    if (isBuffer && (!mimeType || !fileName)) {
      throw new Error(
        'mimeType and fileName are required when passing a Buffer',
      );
    }

    const buffer = isBuffer ? fileOrBuffer : fileOrBuffer.buffer;
    const size = isBuffer ? fileOrBuffer.length : fileOrBuffer.size;
    const mimetype = isBuffer ? mimeType! : fileOrBuffer.mimetype;
    const originalName = isBuffer ? fileName! : fileOrBuffer.originalName;

    return this.minioClient
      ?.putObject(this.BUCKET_NAME, key, buffer, size, {
        'Content-Type': mimetype,
      })
      .then(() => ({
        key: key,
        fileName: originalName,
        mimeType: mimetype,
        createdAt: new Date(),
        size: size,
      }));
  };

  getPresignedUrl = (key: string) =>
    this.minioClient?.presignedGetObject(
      this.BUCKET_NAME,
      key,
      this.MINIO_PRESIGNED_URL_EXPIRATION_TIME,
    );

  getStats = (key: string) =>
    this.minioClient?.statObject(this.BUCKET_NAME, key);

  getFile = (key: string) => this.minioClient?.getObject(this.BUCKET_NAME, key);

  copyFile = (sourceKey: string, destinationKey: string) =>
    this.minioClient?.copyObject(
      this.BUCKET_NAME,
      destinationKey,
      `${this.BUCKET_NAME}/${sourceKey}`,
    );

  deleteFiles = (keys: string[]) =>
    this.minioClient?.removeObjects(this.BUCKET_NAME, keys);
}
