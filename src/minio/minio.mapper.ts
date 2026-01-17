import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import {
  EnvironmentVariables,
  MinioConfig,
} from 'src/_utils/config/env.config';
import {
  GetFileDto,
  GetMinioFileDto,
} from './_utils/dto/response/get-minio-file.dto';
import { MinioService } from './minio.service';
import { MinioFile } from './minio-file.schema';

@Injectable()
export class MinioMapper {
  constructor(
    private readonly minioService: MinioService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  toGetMinioFileDto = (minioFile: MinioFile): GetMinioFileDto => ({
    key: minioFile.key,
    fileName: minioFile.fileName,
    mimeType: minioFile.mimeType,
    size: minioFile.size,
  });

  toGetFileDto = async (minioFile: MinioFile): Promise<GetFileDto> => ({
    url: await this.minioService.getPresignedUrl(minioFile.key),
    fileName: minioFile.fileName,
    mimeType: minioFile.mimeType,
    size: minioFile.size,
  });

  toUserProfilePictureKey = (userId: string, ext: string): string =>
    `public/users/pfp/${userId}-avatar.${ext}`;

  toGetProfilePictureUrl = (userId: string, ext: string): string =>
    `https://${this.configService.get<MinioConfig>('MINIO').MINIO_ENDPOINT}/${this.configService.get<MinioConfig>('MINIO').MINIO_BUCKET_NAME}/public/users/pfp/${userId}-avatar.${ext}`;

  toOrganizationLogoKey = (organizationId: string, ext: string): string =>
    `public/organizations/${organizationId}/logo.${ext}`;

  toOrganizationLogoUrl = (organizationId: string, ext: string): string =>
    `https://${this.configService.get<MinioConfig>('MINIO').MINIO_ENDPOINT}/${this.configService.get<MinioConfig>('MINIO').MINIO_BUCKET_NAME}/public/organizations/${organizationId}/logo.${ext}`;
}
