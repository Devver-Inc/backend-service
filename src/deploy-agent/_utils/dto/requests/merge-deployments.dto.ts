import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MergeDeploymentsDto {
  @ApiProperty({ example: '0f8fad5b-d9cb-469f-a165-70867728950e' })
  @IsUUID('4')
  firstDeploymentId: string;

  @ApiProperty({ example: '7c9e6679-7425-40de-944b-e07fc1f90ae7' })
  @IsUUID('4')
  secondDeploymentId: string;
}
