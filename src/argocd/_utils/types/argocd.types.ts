import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ArgoCdApplicationStatus {
  metadata: { name: string };
  status: {
    health: { status: string };
    sync: { status: string };
    operationState?: {
      phase?: string;
      message?: string;
    };
  };
}

export class ArgoDeploymentStatusEvent {
  @ApiProperty({ example: 'lc8q7su06yeg-s-organization-svelte-2' })
  appName: string;

  @ApiProperty({ example: 'Healthy', description: 'ArgoCD health status' })
  healthStatus: string;

  @ApiProperty({ example: 'Synced', description: 'ArgoCD sync status' })
  syncStatus: string;

  @ApiPropertyOptional({
    example: 'Succeeded',
    description: 'Last operation phase',
  })
  operationPhase?: string;

  @ApiPropertyOptional({ example: 'successfully synced (all tasks run)' })
  operationMessage?: string;

  @ApiProperty({ example: '2026-03-24T07:09:08.547Z' })
  timestamp: string;

  @ApiProperty({
    example: true,
    description:
      'Whether the pod is reachable and serving requests (verified via deploy-agent)',
  })
  podReady: boolean;
}
