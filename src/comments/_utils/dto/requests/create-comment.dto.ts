import { Type } from 'class-transformer';
import { IsEmail, IsString, MinLength, ValidateNested } from 'class-validator';
import { Optional } from 'class-validator-extended';
import { CreatePositionDto } from 'src/_utils/dto/requests/create-position.dto';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  @Optional()
  @IsEmail()
  guestEmail?: string;

  @Optional()
  @IsString()
  repo?: string;

  @Optional()
  @IsString()
  branch?: string;

  @Optional()
  @Type(() => CreatePositionDto)
  @ValidateNested()
  position?: CreatePositionDto;
}
