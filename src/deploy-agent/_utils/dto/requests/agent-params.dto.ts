import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId, Matches } from 'class-validator';
import {
  DEPLOYMENT_ID_PATTERN,
  REPO_NAME_PATTERN,
} from '../../constants/validation-patterns';
import { DeploymentAction } from '../../types/agent.types';

// Path params end up in agent URLs: Express decodes %2F, so they must be validated.

export class ProjectParamsDto {
  @ApiProperty({ example: '6650a1b2c3d4e5f6a7b8c9d0' })
  @IsMongoId()
  projectId: string;
}

export class RepoParamsDto extends ProjectParamsDto {
  @ApiProperty({ example: 'my-repo' })
  @Matches(REPO_NAME_PATTERN, { message: 'INVALID_REPO_NAME' })
  name: string;
}

export class DeploymentParamsDto extends ProjectParamsDto {
  @ApiProperty({ example: 'myrepo-main-3f9a1c' })
  @Matches(DEPLOYMENT_ID_PATTERN, { message: 'INVALID_DEPLOYMENT_ID' })
  deploymentId: string;
}

export class DeploymentActionParamsDto extends DeploymentParamsDto {
  @ApiProperty({ enum: ['start', 'stop', 'restart'] })
  @IsIn(['start', 'stop', 'restart'])
  action: DeploymentAction;
}
