import { IsNotEmpty, IsString } from "class-validator";
import { Optional } from "class-validator-extended";

export class UpdateUserPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Optional()
  oldPassword?: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
