import { IsString, IsStrongPassword } from 'class-validator';

export class ConfirmRecoverAccountPasswordDto {
  @IsString()
  token: string;

  @IsStrongPassword()
  password: string;
}
