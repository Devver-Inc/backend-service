import { ServiceName, Services } from './agent.types';
import { DatabaseLink } from 'src/projects/project.types';

export interface CreateRepoData {
  projectId: string;
  organizationId: string;
  name: string;
}

export interface UpsertDeploymentData {
  projectId: string;
  organizationId: string;
  repo: string;
  branch: string;
  serviceName: ServiceName;
  deploymentId: string;
  host: string;
  commit: string;
  service: Services;
  dbLinks?: DatabaseLink[];
}
