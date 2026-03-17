import { IsString, MaxLength, MinLength } from 'class-validator';
import { Optional } from 'class-validator-extended';

export class UpdateOrganizationDto {
  @Optional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @Optional()
  @IsString()
  @MaxLength(256)
  description?: string;
}
