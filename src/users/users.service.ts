import { Injectable } from "@nestjs/common";
import { CreateUserDto } from "./_utils/dto/request/create-user.dto";
import { GetUserDto } from "./_utils/dto/response/get-user.dto";
import { UsersMapper } from "./users.mapper";
import { UsersRepository } from "./users.repository";
import { UserDocument } from "./user.schema";
import { UpdateUserDto } from "./_utils/dto/request/update-user.dto";
import { UserQueryDto } from "./_utils/dto/request/user-query.dto";
import { LoginResponseDto } from "src/auth/_utils/dto/response/login-response.dto";
import { AuthService } from "src/auth/auth.service";
import { EncryptionService } from "src/encryption/encryption.service";
import { FunctionPaginatedResponseDto } from "src/_utils/dto/response/function-paginated-response.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersMapper: UsersMapper,
    private readonly authService: AuthService,
    private readonly encryptionService: EncryptionService
  ) {}

  async createUser(body: CreateUserDto): Promise<LoginResponseDto> {
    const hashPassword = await this.encryptionService.encrypt(body.password);

    await this.usersRepository.create({ ...body, password: hashPassword });

    return this.authService.login({
      email: body.email,
      password: body.password,
      rememberMe: false,
    });
  }

  async findPaginated(
    queries: UserQueryDto
  ): Promise<FunctionPaginatedResponseDto<GetUserDto>> {
    const { users, totalCount } =
      await this.usersRepository.findPaginated(queries);
    return {
      data: users.map(this.usersMapper.toGetUserDto),
      totalCount,
    };
  }

  updateUser = (
    user: UserDocument,
    body: UpdateUserDto
  ): Promise<GetUserDto> =>
    this.usersRepository
      .updateOrThrow(user.id, body)
      .then(this.usersMapper.toGetUserDto);

  async sendActivateAccountEmail(email: string) {}

  deleteUser = (user: UserDocument) => this.usersRepository.delete(user.id);
}
