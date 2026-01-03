import { Injectable } from "@nestjs/common";
import { LogtoUser } from "src/logto/_utils/types/responses/responses.type";
import { GetUserLightDto } from "./_utils/dto/responses/get-user-light.dto";

@Injectable()
export class UsersMapper {
  toUserLightDtoFromArray = (users: LogtoUser[]): GetUserLightDto[] =>
    users.map((user) => this.toUserLightDto(user));

  toUserLightDto = (user: LogtoUser): GetUserLightDto => ({
    id: user.id,
    name: user.name,
    avatarUrl: user.avatar ?? null,
  });
}
