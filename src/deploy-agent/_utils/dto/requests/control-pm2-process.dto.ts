import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { PM2_PROCESS_PATTERN } from '../../constants/validation-patterns';

export class ControlPm2ProcessDto {
  @ApiProperty({ example: 'web-test-main-3000' })
  @IsString()
  @Matches(PM2_PROCESS_PATTERN, { message: 'INVALID_PM2_PROCESS_NAME' })
  name: string;
}
