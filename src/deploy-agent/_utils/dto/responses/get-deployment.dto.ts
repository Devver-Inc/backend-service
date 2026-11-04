import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeploymentStatus, ServiceName } from '../../types/agent.types';

export class GetAgentDeploymentDto {
  @ApiProperty({ example: 'myrepo-main-3f9a1c' })
  deploymentId: string;

  @ApiProperty({ example: 'myrepo' })
  repo: string;

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
    example:
      'https://myrepo-main-3f9a1c--6650a1b2c3d4e5f6a7b8c9d0.preview.devver.app',
  })
  url: string;

  @ApiProperty({ enum: ['running', 'stopped', 'failed'] })
  status: DeploymentStatus['status'];

  @ApiProperty({ example: '2026-10-27T10:30:00.000Z' })
  startedAt: string;
}
