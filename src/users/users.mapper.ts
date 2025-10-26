import { Injectable } from "@nestjs/common";
import { GetUserDto } from "./_utils/dto/response/get-user.dto";
import { UserDocument } from "./user.schema";

@Injectable()
export class UsersMapper {
  constructor() {}

  toGetUserDto = (user: UserDocument): GetUserDto => ({
    id: user.id,
    email: user.email,
    firstname: user.firstName,
    lastname: user.lastName,
  });
}
