import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeploymentStatus, ServiceName } from '../../types/agent.types';

export class GetAgentDeploymentDto {
  @ApiProperty({ example: 'main-3f9a1c' })
  deploymentId: string;

  @ApiProperty({ example: '9fceb02d0ae598e95dc970b74767f19372d61af8' })
  rootCommit: string;

  @ApiPropertyOptional({
    example: 'main',
    description: 'Absent for deployments the backend has no record of',
  })
  branch?: string;

  @ApiPropertyOptional({ enum: ['web', 'api'] })
  service?: ServiceName;

  @ApiProperty({ example: 'a1b2c3d4e5f6' })
  commit: string;

  @ApiProperty({
    example: 'https://main-3f9a1c--6650a1b2c3d4e5f6a7b8c9d0.preview.devver.app',
  })
  url: string;

  @ApiProperty({ enum: ['running', 'stopped', 'failed'] })
  status: DeploymentStatus['status'];

  @ApiProperty({ example: '2026-10-27T10:30:00.000Z' })
  startedAt: string;
}
