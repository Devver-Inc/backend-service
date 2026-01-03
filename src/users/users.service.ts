import { Injectable } from "@nestjs/common";
import { LogtoUser } from "src/logto/_utils/types/responses/responses.type";
import { LogtoRequests } from "src/logto/logto.requests";
import { LogtoService } from "src/logto/logto.service";
import { UpdateAccountDto } from "./_utils/dto/requests/update-account.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly logtoService: LogtoService,
    private readonly logtoRequests: LogtoRequests,
  ) {}

  createAccount(connectedUser: LogtoUser) {
    return this.logtoService.manageUserWithoutOrganization(connectedUser);
  }

  async updateAccount(connectedUser: LogtoUser, dto: UpdateAccountDto) {
    // if (dto.profilePictureFile) {
    //   await this.minioService.uploadFile(
    //     dto.profilePictureFile,
    //     this.minioMapper.toUserProfilePictureKey(
    //       connectedUser.id,
    //       dto.profilePictureFile.extension
    //     )
    //   );
    //   this.logtoRequests.updateUserProfilePicture(
    //     connectedUser.id,
    //     this.minioMapper.toGetProfilePictureUrl(
    //       connectedUser.id,
    //       dto.profilePictureFile.extension
    //     )
    //   );
    // }
    await this.logtoRequests.updateUserProfile(connectedUser.id, dto);
  }
}
