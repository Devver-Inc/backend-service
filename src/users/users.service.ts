import { Injectable } from '@nestjs/common';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { LogtoRequests } from 'src/logto/logto.requests';
import { LogtoService } from 'src/logto/logto.service';
import { FileUploadService } from 'src/storage/file-upload.service';
import { StorageMapper } from 'src/storage/storage.mapper';
import { StorageService } from 'src/storage/storage.service';
import { UpdateAccountDto } from './_utils/dto/requests/update-account.dto';
import { UpdateProfilePictureDto } from './_utils/dto/requests/update-profile-picture.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly logtoService: LogtoService,
    private readonly logtoRequests: LogtoRequests,
    private readonly fileUploadService: FileUploadService,
    private readonly storageMapper: StorageMapper,
    private readonly storageService: StorageService,
  ) {}

  async findManyByIds(ids: string[]): Promise<Map<string, LogtoUser>> {
    const unique = [...new Set(ids)];
    const users = await Promise.all(
      unique.map((id) => this.logtoRequests.fetchUserSafe(id)),
    );
    return new Map(
      unique.flatMap((id, i) => (users[i] ? [[id, users[i]]] : [])),
    );
  }

  createAccount = (user: LogtoUser) =>
    this.logtoService.manageUserWithoutOrganization(user);

  async updateAccount(user: LogtoUser, dto: UpdateAccountDto) {
    await this.logtoRequests.updateUserProfile(user.id, dto);
  }

  async uploadProfilePicture(user: LogtoUser, dto: UpdateProfilePictureDto) {
    const picture = this.storageMapper.createUserProfilePictureLocation(
      user.id,
      dto.profilePictureFile.extension,
    );
    const previousKey = user.avatar
      ? this.storageMapper.toObjectKeyFromPublicUrl(user.avatar)
      : null;

    await this.fileUploadService.uploadFilesWithCleanup(
      [{ file: dto.profilePictureFile, key: picture.key }],
      async () => {
        await this.logtoRequests.updateUserProfilePicture(user.id, picture.url);
      },
    );

    if (previousKey && previousKey !== picture.key) {
      await this.storageService.deleteFiles([previousKey]);
    }
  }

  async deleteProfilePicture(user: LogtoUser) {
    const objectKey = user.avatar
      ? this.storageMapper.toObjectKeyFromPublicUrl(user.avatar)
      : null;

    await this.logtoRequests.updateUserProfilePicture(user.id, null);

    if (objectKey) {
      await this.storageService.deleteFiles([objectKey]);
    }
  }
}
