import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { DISPLAY_NAME_PATTERN } from '../../constants/validation-patterns';

export class RenameDeploymentDto {
  @ApiProperty({ example: 'Checkout redesign', maxLength: 80 })
  @IsString()
  @Matches(DISPLAY_NAME_PATTERN, { message: 'INVALID_DISPLAY_NAME' })
  displayName: string;
}
