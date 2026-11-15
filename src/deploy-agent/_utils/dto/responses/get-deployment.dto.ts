import { ApiProperty } from '@nestjs/swagger';
import { ServiceName } from '../../types/agent.types';

export const DEPLOYMENT_STATUSES = [
  'preparing',
  'ready',
  'stopped',
  'failed',
  'degraded',
] as const;
export type DeploymentListStatus = (typeof DEPLOYMENT_STATUSES)[number];

export class GetAgentDeploymentDto {
  @ApiProperty({ example: '0f8fad5b-d9cb-469f-a165-70867728950e' })
  deploymentId: string;

  @ApiProperty({ example: '9fceb02d0ae598e95dc970b74767f19372d61af8' })
  rootCommit: string;

  @ApiProperty({ example: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678' })
  commit: string;

  @ApiProperty({
    nullable: true,
    description: 'Nearest ready deployment on the commit first-parent history',
  })
  parentDeploymentId: string | null;

  @ApiProperty({ nullable: true, description: 'Set only for merges' })
  secondParentDeploymentId: string | null;

  @ApiProperty({ nullable: true, example: 'Checkout redesign' })
  displayName: string | null;

  @ApiProperty({ enum: ['web', 'api'] })
  service: ServiceName;

  @ApiProperty({
    enum: DEPLOYMENT_STATUSES,
    description:
      'degraded: was ready but its process is gone; stopped: ready, stopped on purpose',
  })
  status: DeploymentListStatus;

  @ApiProperty({
    nullable: true,
    example: 'install',
    description: 'The phase that failed',
  })
  stage: string | null;

  @ApiProperty({
    nullable: true,
    example:
      'https://0f8fad5b-d9cb-469f-a165-70867728950e--6650a1b2c3d4e5f6a7b8c9d0.preview.devver.app',
  })
  url: string | null;

  @ApiProperty({ example: '2026-11-15T10:30:00.000Z' })
  createdAt: Date;
}
