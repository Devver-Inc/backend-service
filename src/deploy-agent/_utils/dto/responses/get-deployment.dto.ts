import { ApiProperty } from '@nestjs/swagger';
import {
  AgentDeploymentStatus,
  Services,
} from '../../../schemas/deployment.schema';
import { PM2Action } from '../../types/agent.types';

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

export class GetAgentDeploymentDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'https://github.com/user/repo.git' })
  repo: string;

  @ApiProperty({ example: 'main' })
  branch: string;

  @ApiProperty({ example: 'a1b2c3d', nullable: true })
  commit: string | null;

  @ApiProperty({ description: 'Services configuration map' })
  services: Services;

  @ApiProperty({ example: 'deployed', enum: AgentDeploymentStatus })
  status: AgentDeploymentStatus;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
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
