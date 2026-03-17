import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateAccountDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;
}
