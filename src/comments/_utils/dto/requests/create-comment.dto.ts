import { Type } from 'class-transformer';
import { IsString, MinLength, ValidateNested } from 'class-validator';
import { Optional } from 'class-validator-extended';
import { CreatePositionDto } from 'src/_utils/dto/requests/create-position.dto';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  @Optional()
  @Type(() => CreatePositionDto)
  @ValidateNested()
  position?: CreatePositionDto;
}
