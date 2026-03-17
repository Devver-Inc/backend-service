import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ControlPm2ProcessDto {
  @ApiProperty({ example: 'web-test-main-3000' })
  @IsString()
  @MinLength(1)
  name: string;
}
