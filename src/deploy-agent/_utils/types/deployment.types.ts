import { ServiceName, Services } from './agent.types';
import { DatabaseLink } from 'src/projects/project.types';

export type DeploymentRecordStatus = 'preparing' | 'ready' | 'failed';

export interface NewDeploymentData {
  projectId: string;
  organizationId: string;
  repo: string;
  commit: string;
  parentDeploymentId: string | null;
  secondParentDeploymentId: string | null;
  serviceName: ServiceName;
  deploymentId: string;
  host: string;
  service: Services;
  dbLinks?: DatabaseLink[];
}
