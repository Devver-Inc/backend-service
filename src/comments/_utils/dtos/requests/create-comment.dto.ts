import { Type } from 'class-transformer';
import { IsString, MinLength, ValidateNested } from 'class-validator';
import { CreatePositionDto } from 'src/_utils/dtos/requests/create-position.dto';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  @Type(() => CreatePositionDto)
  @ValidateNested()
  position: CreatePositionDto;
}
