import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, ValidateNested } from 'class-validator';
import { BRANCH_PATTERN } from '../../constants/validation-patterns';
import { ExactlyOneService } from '../../validators/exactly-one-service.validator';
import { ServicesDto } from './create-deployment.dto';

export class InitRepoDto {
  @ApiProperty({ example: 'main' })
  @IsString()
  @Matches(BRANCH_PATTERN, { message: 'INVALID_BRANCH_NAME' })
  branch: string;

  @ApiProperty({
    type: () => ServicesDto,
    description: 'Exactly one service; only root and install are used.',
    example: { web: { root: './apps/web' } },
  })
  @ExactlyOneService()
  @ValidateNested()
  @Type(() => ServicesDto)
  service: ServicesDto;
}
