import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateRepoDto {
  @ApiProperty({ example: 'shop-web' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;
}
