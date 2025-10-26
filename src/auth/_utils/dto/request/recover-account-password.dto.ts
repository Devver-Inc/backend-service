import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RecoverAccountPasswordDto {
  @ApiProperty({ example: 'example@gmail.com' })
  @IsEmail()
  email: string;
}
