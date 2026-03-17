import { ApiProperty } from '@nestjs/swagger';

class ContainerDto {
  @ApiProperty({ example: 'nginx:latest' })
  image: string;

  @ApiProperty({ example: 80 })
  port: number;

  @ApiProperty({ example: 'app', enum: ['app', 'os'] })
  type: 'app' | 'os';

  @ApiProperty({ example: [], required: false })
  command?: string[];

  @ApiProperty({ example: [], required: false })
  args?: string[];
}

class ResourcesRequestsDto {
  @ApiProperty({ example: '256Mi' })
  memory: string;

  @ApiProperty({ example: '250m' })
  cpu: string;
}

class ResourcesLimitsDto {
  @ApiProperty({ example: '512Mi' })
  memory: string;

  @ApiProperty({ example: '500m' })
  cpu: string;
}

class ResourcesDto {
  @ApiProperty({ type: ResourcesRequestsDto })
  requests: ResourcesRequestsDto;

  @ApiProperty({ type: ResourcesLimitsDto })
  limits: ResourcesLimitsDto;
}

class PersistenceDto {
  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiProperty({ example: '10Gi', required: false })
  size?: string;

  @ApiProperty({ example: '/data', required: false })
  mountPath?: string;
}

class PortsDto {
  @ApiProperty({ example: 80 })
  http: number;

  @ApiProperty({ example: 443 })
  https: number;
}

export class GetDeploymentDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  organizationId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439013' })
  projectId: string;

  @ApiProperty({ example: 'devver' })
  organizationName: string;

  @ApiProperty({ example: 'my-web-app' })
  projectName: string;

  @ApiProperty({ example: 'devver.app' })
  organizationDomain: string;

  @ApiProperty({ type: ContainerDto })
  container: ContainerDto;

  @ApiProperty({ type: ResourcesDto })
  resources: ResourcesDto;

  @ApiProperty({ type: PersistenceDto })
  persistence: PersistenceDto;

  @ApiProperty({ example: 2 })
  replicaCount: number;

  @ApiProperty({ type: PortsDto })
  ports: PortsDto;

  @ApiProperty({ example: { environment: 'production', team: 'backend' } })
  labels: Record<string, string>;

  @ApiProperty({ example: { description: 'My deployment' } })
  annotations: Record<string, string>;

  @ApiProperty({ example: 'devver/my-web-app/values.yaml' })
  githubPath: string;

  @ApiProperty({ example: 'deployed', enum: ['pending', 'deployed', 'failed'] })
  status: 'pending' | 'deployed' | 'failed';

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}

export class GetDeploymentLightDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'devver' })
  organizationName: string;

  @ApiProperty({ example: 'my-web-app' })
  projectName: string;

  @ApiProperty({ example: 'nginx:latest' })
  containerImage: string;

  @ApiProperty({ example: 'deployed', enum: ['pending', 'deployed', 'failed'] })
  status: 'pending' | 'deployed' | 'failed';

  @ApiProperty({ example: 2 })
  replicaCount: number;

  @ApiProperty({ example: 'devver/my-web-app/values.yaml' })
  githubPath: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
