import { Injectable } from '@nestjs/common';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { LogtoRequests } from 'src/logto/logto.requests';
import { LogtoService } from 'src/logto/logto.service';
import { FileUploadService } from 'src/minio/file-upload.service';
import { MinioMapper } from 'src/minio/minio.mapper';
import { MinioService } from 'src/minio/minio.service';
import { UpdateAccountDto } from './_utils/dto/requests/update-account.dto';
import { UpdateProfilePictureDto } from './_utils/dto/requests/update-profile-picture.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly logtoService: LogtoService,
    private readonly logtoRequests: LogtoRequests,
    private readonly fileUploadService: FileUploadService,
    private readonly minioMapper: MinioMapper,
    private readonly minioService: MinioService,
  ) {}

  createAccount = (user: LogtoUser) =>
    this.logtoService.manageUserWithoutOrganization(user);

  async updateAccount(user: LogtoUser, dto: UpdateAccountDto) {
    await this.logtoRequests.updateUserProfile(user.id, dto);
  }

  async uploadProfilePicture(user: LogtoUser, dto: UpdateProfilePictureDto) {
    const profilePictureKey = this.minioMapper.toUserProfilePictureKey(
      user.id,
      dto.profilePictureFile.extension,
    );

    await this.fileUploadService.uploadFilesWithCleanup(
      [{ file: dto.profilePictureFile, key: profilePictureKey }],
      async () => {
        await this.logtoRequests.updateUserProfilePicture(
          user.id,
          this.minioMapper.toGetProfilePictureUrl(
            user.id,
            dto.profilePictureFile.extension,
          ),
        );
      },
    );
  }

  async deleteProfilePicture(user: LogtoUser) {
    const picture =
      (user as unknown as { picture?: string | null }).picture ?? null;
    const objectKey = picture
      ? this.minioMapper.toObjectKeyFromPublicUrl(picture)
      : null;

    await this.logtoRequests.updateUserProfilePicture(user.id, null);

    if (objectKey) {
      await this.minioService.deleteFiles([objectKey]);
    }
  }
}
