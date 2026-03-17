import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateRepoDto {
  @ApiProperty({ example: 'my-repo' })
  @IsString()
  @MinLength(1)
  name: string;
}
