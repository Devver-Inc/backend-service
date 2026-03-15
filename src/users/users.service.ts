import { Injectable } from '@nestjs/common';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { LogtoRequests } from 'src/logto/logto.requests';
import { LogtoService } from 'src/logto/logto.service';
import { FileUploadService } from 'src/minio/file-upload.service';
import { MinioMapper } from 'src/minio/minio.mapper';
import { UpdateAccountDto } from './_utils/dto/requests/update-account.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly logtoService: LogtoService,
    private readonly logtoRequests: LogtoRequests,
    private readonly fileUploadService: FileUploadService,
    private readonly minioMapper: MinioMapper,
  ) {}

  createAccount(user: LogtoUser) {
    return this.logtoService.manageUserWithoutOrganization(user);
  }

  async updateAccount(user: LogtoUser, dto: UpdateAccountDto) {
    const profilePictureFile = dto.profilePictureFile;
    const shouldRemoveProfilePicture =
      Boolean(dto.removeProfilePicture) && !profilePictureFile;
    const profilePictureKey = profilePictureFile
      ? this.minioMapper.toUserProfilePictureKey(
          user.id,
          profilePictureFile.extension,
        )
      : null;

    await this.fileUploadService.uploadFilesWithCleanup(
      profilePictureFile && profilePictureKey
        ? [{ file: profilePictureFile, key: profilePictureKey }]
        : [],
      async () => {
        await this.logtoRequests.updateUserProfile(user.id, dto);

        if (profilePictureFile) {
          await this.logtoRequests.updateUserProfilePicture(
            user.id,
            this.minioMapper.toGetProfilePictureUrl(
              user.id,
              profilePictureFile.extension,
            ),
          );
        } else if (shouldRemoveProfilePicture) {
          await this.logtoRequests.updateUserProfilePicture(user.id, null);
        }
      },
    );
  }
}
