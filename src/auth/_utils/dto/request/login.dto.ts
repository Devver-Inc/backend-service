import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsString } from "class-validator";
import { IsExisting } from "src/_utils/decorators/unique-exists.decorator";
import { User } from "src/users/user.schema";

export class LoginDto {
  @ApiProperty({ example: "example@gmail.com" })
  @IsEmail()
  @IsExisting(User, { property: "email" })
  email: string;

  @ApiProperty({ example: "Password123!" })
  @IsString()
  password: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  rememberMe: boolean;
}
