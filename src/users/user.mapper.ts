import { Injectable } from '@nestjs/common';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { GetUserLightDto } from './_utils/dto/responses/get-user-light.dto';

@Injectable()
export class UsersMapper {
  toUserLightDtoFromArray = (users: LogtoUser[]): GetUserLightDto[] =>
    users.map((user) => this.toUserLightDto(user));

  toUserLightDto = (user: LogtoUser): GetUserLightDto => ({
    id: user.id,
    email: user.primaryEmail ?? null,
    name:
      user.name ??
      user.username ??
      this.buildNameFromProfile(user.profile) ??
      null,
    avatarUrl: user.avatar ?? null,
  });

  private buildNameFromProfile = (
    profile?: LogtoUser['profile'],
  ): string | null => {
    if (!profile) return null;
    const parts = [profile.givenName, profile.familyName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  };
}
