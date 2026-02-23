import { Injectable, Logger } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { CreateDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { GitHubService } from './github.service';

interface ValuesYaml {
  organization: {
    name: string;
    domain: string;
  };
  project: {
    name: string;
  };
  container: {
    image: string;
    port: number;
    type: string;
    command?: string[];
    args?: string[];
  };
  resources: {
    requests: {
      memory: string;
      cpu: string;
    };
    limits: {
      memory: string;
      cpu: string;
    };
  };
  persistence: {
    enabled: boolean;
    size?: string;
    mountPath?: string;
  };
  replicaCount: number;
  ports: {
    http: number;
    https: number;
  };
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

@Injectable()
export class DeploymentsService {
  private readonly logger = new Logger(DeploymentsService.name);

  constructor(private readonly githubService: GitHubService) {}

  private generateValuesYaml(dto: CreateDeploymentDto): string {
    const values: ValuesYaml = {
      organization: {
        name: dto.organizationName,
        domain: dto.organizationDomain || 'devver.app',
      },
      project: {
        name: dto.projectName,
      },
      container: {
        image: dto.container.image,
        port: dto.container.port,
        type: dto.container.type,
        ...(dto.container.command && { command: dto.container.command }),
        ...(dto.container.args && { args: dto.container.args }),
      },
      resources: {
        requests: {
          memory: dto.resources.requestsMemory,
          cpu: dto.resources.requestsCpu,
        },
        limits: {
          memory: dto.resources.limitsMemory,
          cpu: dto.resources.limitsCpu,
        },
      },
      persistence: {
        enabled: dto.persistence.enabled,
        ...(dto.persistence.size && { size: dto.persistence.size }),
        ...(dto.persistence.mountPath && {
          mountPath: dto.persistence.mountPath,
        }),
      },
      replicaCount: dto.replicaCount,
      ports: {
        http: dto.httpPort || 80,
        https: dto.httpsPort || 443,
      },
      labels: dto.labels || {},
      annotations: dto.annotations || {},
    };

    // Generate YAML with comments
    const yamlContent = `# Configuration de l'organisation et du projet
organization:
  name: "${values.organization.name}"  # Nom de l'organisation
  domain: "${values.organization.domain}"  # Domaine principal

project:
  name: "${values.project.name}"  # Nom du projet

# Configuration du conteneur (OS Linux complet ou application)
container:
  image: "${values.container.image}"  # Image du conteneur (OS Linux ou application)
  port: ${values.container.port}  # Port exposé par le conteneur
  type: "${values.container.type}"
  ${values.container.command ? `\n  command: ${JSON.stringify(values.container.command)}` : ''}
  ${values.container.args ? `\n  args: ${JSON.stringify(values.container.args)}` : ''}

# Configuration des ressources
resources:
  requests:
    memory: "${values.resources.requests.memory}"
    cpu: "${values.resources.requests.cpu}"
  limits:
    memory: "${values.resources.limits.memory}"
    cpu: "${values.resources.limits.cpu}"

# Configuration de la persistance
persistence:
  enabled: ${values.persistence.enabled}
${values.persistence.size ? `  size: "${values.persistence.size}"` : '  # size: "10Gi"'}
${values.persistence.mountPath ? `  mountPath: "${values.persistence.mountPath}"  # Choix du répertoire à persister` : '  # mountPath: "/data"'}

# Configuration du nombre de replicas
replicaCount: ${values.replicaCount}

# Configuration des ports
ports:
  http: ${values.ports.http}
  https: ${values.ports.https}

# Labels et sélecteurs additionnels
labels: ${Object.keys(values.labels).length > 0 ? yaml.dump(values.labels).trim() : '{}'}
annotations: ${Object.keys(values.annotations).length > 0 ? yaml.dump(values.annotations).trim() : '{}'}
`;

    return yamlContent;
  }

  /**
   * Create a new deployment and push to GitHub
   */
  async createDeployment(dto: CreateDeploymentDto): Promise<{
    success: boolean;
    message: string;
    organizationName: string;
    projectName: string;
    path: string;
  }> {
    try {
      this.logger.log(
        `Creating deployment for ${dto.organizationName}/${dto.projectName}`,
      );

      // Generate YAML content
      const yamlContent = this.generateValuesYaml(dto);

      // Push to GitHub
      await this.githubService.pushValuesYaml(
        dto.organizationName,
        dto.projectName,
        yamlContent,
      );

      const path = `${dto.organizationName}/${dto.projectName}/values.yaml`;

      this.logger.log(`Deployment created successfully at ${path}`);

      return {
        success: true,
        message: 'Deployment created successfully',
        organizationName: dto.organizationName,
        projectName: dto.projectName,
        path,
      };
    } catch (error) {
      this.logger.error('Failed to create deployment:', error);
      throw error;
    }
  }

  /**
   * Update an existing deployment
   */
  async updateDeployment(dto: CreateDeploymentDto): Promise<{
    success: boolean;
    message: string;
    organizationName: string;
    projectName: string;
    path: string;
  }> {
    // Update is the same as create - GitHub API handles both
    return this.createDeployment(dto);
  }

  /**
   * Delete a deployment from GitHub
   */
  async deleteDeployment(
    organizationName: string,
    projectName: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const path = `${organizationName}/${projectName}/values.yaml`;

      this.logger.log(`Deleting deployment at ${path}`);

      await this.githubService.deleteFile(
        path,
        `Delete ${projectName} deployment for ${organizationName}`,
      );

      return {
        success: true,
        message: 'Deployment deleted successfully',
      };
    } catch (error) {
      this.logger.error('Failed to delete deployment:', error);
      throw error;
    }
  }

  /**
   * Check if a deployment exists
   */
  async deploymentExists(
    organizationName: string,
    projectName: string,
  ): Promise<boolean> {
    const path = `${organizationName}/${projectName}/values.yaml`;
    return this.githubService.fileExists(path);
  }
}
