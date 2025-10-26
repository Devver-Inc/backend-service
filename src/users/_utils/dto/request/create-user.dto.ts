import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsString, IsStrongPassword } from "class-validator";
import { IsUnique } from "src/_utils/decorators/unique-exists.decorator";
import { User } from "src/users/user.schema";

export class CreateUserDto {
  @ApiProperty({ example: "example@gmail.com" })
  @IsEmail()
  @IsUnique(User, { property: "email" })
  email: string;

  @ApiProperty({ example: "Password123!" })
  @IsStrongPassword()
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}
