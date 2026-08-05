import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  EnvironmentVariables,
  StorageConfig,
} from 'src/_utils/config/env.config';

@Injectable()
export class StorageMapper {
  private readonly publicBaseUrl: string;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    this.publicBaseUrl = configService
      .get<StorageConfig>('STORAGE')
      .STORAGE_PUBLIC_URL.replace(/\/$/, '');
  }

  createUserProfilePictureLocation(userId: string, ext: string) {
    return this.createLocation(
      `public/users/pfp/${userId}-avatar-${randomUUID()}.${ext}`,
    );
  }

  createOrganizationLogoLocation(organizationId: string, ext: string) {
    return this.createLocation(
      `public/organizations/${organizationId}/logo-${randomUUID()}.${ext}`,
    );
  }

  toObjectKeyFromPublicUrl = (url: string): string | null => {
    try {
      const pathname = new URL(url).pathname;
      const publicIndex = pathname.indexOf('/public/');
      return publicIndex === -1 ? null : pathname.slice(publicIndex + 1);
    } catch {
      return null;
    }
  };

  private createLocation(key: string): { key: string; url: string } {
    return { key, url: `${this.publicBaseUrl}/${key}` };
  }
}
