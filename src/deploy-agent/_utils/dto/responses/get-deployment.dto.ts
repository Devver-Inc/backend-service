import { ApiProperty } from '@nestjs/swagger';
import {
  PM2Action,
  PM2Process,
  PM2ProcessStatus,
  ServiceDeployResult,
  ServiceName,
} from '../../types/agent.types';

export class LogEntryDto {
  @ApiProperty({ example: 'api' })
  service: string;

  @ApiProperty({ example: 'info' })
  level: string;

  @ApiProperty({ example: 'Server started on port 3000' })
  message: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  timestamp: string;
}

export class PM2ProcessDto implements PM2Process {
  @ApiProperty({ example: 'web-myrepo-main-3000' })
  name: string;

  @ApiProperty({ example: 0 })
  pm_id: number;

  @ApiProperty({ example: 'online', enum: PM2ProcessStatus })
  status: PM2ProcessStatus;

  @ApiProperty({ example: 0 })
  cpu: number;

  @ApiProperty({ example: 10485760 })
  memory: number;
}

export class ServiceDeployResultDto implements ServiceDeployResult {
  @ApiProperty({ example: 3000 })
  port: number;

  @ApiProperty({ example: 'https://orgt4.projt4.devver.app/myrepo/main' })
  url: string;
}

export class GetAgentDeploymentDto {
  @ApiProperty({ example: 'myrepo-main' })
  deploymentId: string;

  @ApiProperty({ example: 'myrepo' })
  repo: string;

  @ApiProperty({ example: 'main' })
  branch: string;

  @ApiProperty({ example: 'a1b2c3d' })
  commit: string;

  @ApiProperty({ description: 'Deployed service results' })
  service: Partial<Record<ServiceName, ServiceDeployResultDto>>;

  @ApiProperty({ type: PM2ProcessDto, nullable: true })
  process: PM2Process | null;
}

export class GetLogsDto {
  @ApiProperty({ type: [LogEntryDto] })
  logs: LogEntryDto[];
}

export class RestoreResultDto {
  @ApiProperty({ example: 3 })
  restoredRepos: number;

  @ApiProperty({ example: 5 })
  restoredDeployments: number;
}

export class ControlPm2ProcessResultDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'api' })
  name: string;

  @ApiProperty({ example: 'start', enum: PM2Action })
  action: PM2Action;
}
