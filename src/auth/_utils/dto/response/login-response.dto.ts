import { GetUserDto } from 'src/users/_utils/dto/response/get-user.dto';

export class LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: GetUserDto;
}
