import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  private getPublicBaseUrl(): string {
    const minio = this.configService.get<MinioConfig>('MINIO');
    const port = minio.MINIO_PORT;
    const isDefaultPort = !port || port === 443 || port === 80;
    const protocol = port === 443 ? 'https' : 'http';
    const host = isDefaultPort
      ? minio.MINIO_ENDPOINT
      : `${minio.MINIO_ENDPOINT}:${port}`;
    return `${protocol}://${host}/${minio.MINIO_BUCKET_NAME}`;
  }

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
    `${this.getPublicBaseUrl()}/public/users/pfp/${userId}-avatar.${ext}`;

  toOrganizationLogoKey = (organizationId: string, ext: string): string =>
    `public/organizations/${organizationId}/logo.${ext}`;

  toOrganizationLogoUrl = (organizationId: string, ext: string): string =>
    `${this.getPublicBaseUrl()}/public/organizations/${organizationId}/logo.${ext}`;

  toObjectKeyFromPublicUrl = (url: string): string | null => {
    try {
      const pathname = new URL(url).pathname;
      const publicIndex = pathname.indexOf('/public/');
      if (publicIndex === -1) {
        return null;
      }
      return pathname.slice(publicIndex + 1);
    } catch {
      return null;
    }
  };
}
