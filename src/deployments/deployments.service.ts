import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as yaml from 'js-yaml';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ProjectsRepository } from 'src/projects/projects.repository';
import { CreateDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import {
  GetDeploymentDto,
  GetDeploymentLightDto,
} from './_utils/dto/responses/get-deployment.dto';
import { DeploymentDomain } from './deployment.domain';
import { DeploymentMapper } from './deployment.mapper';
import { DeploymentsRepository } from './deployments.repository';
import { GitHubService } from './github.service';

@Injectable()
export class DeploymentsService {
  private readonly logger = new Logger(DeploymentsService.name);

  constructor(
    private readonly deploymentsRepository: DeploymentsRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly deploymentMapper: DeploymentMapper,
    private readonly githubService: GitHubService,
  ) {}

  /**
   * Generate values.yaml content from deployment domain
   */
  private generateValuesYaml(deployment: DeploymentDomain): string {
    const yamlContent = `# Configuration de l'organisation et du projet
organization:
  name: "${deployment.organizationName}"  # Nom de l'organisation
  domain: "${deployment.organizationDomain}"  # Domaine principal

project:
  name: "${deployment.projectName}"  # Nom du projet

# Configuration du conteneur (OS Linux complet ou application)
container:
  image: "${deployment.container.image}"  # Image du conteneur (OS Linux ou application)
  port: ${deployment.container.port}  # Port exposé par le conteneur
  type: "${deployment.container.type}"
  ${deployment.container.command && deployment.container.command.length > 0 ? `command: ${JSON.stringify(deployment.container.command)}` : 'command: []'}
  ${deployment.container.args && deployment.container.args.length > 0 ? `args: ${JSON.stringify(deployment.container.args)}` : 'args: []'}

# Configuration des ressources
resources:
  requests:
    memory: "${deployment.resources.requests.memory}"
    cpu: "${deployment.resources.requests.cpu}"
  limits:
    memory: "${deployment.resources.limits.memory}"
    cpu: "${deployment.resources.limits.cpu}"

# Configuration de la persistance
persistence:
  enabled: ${deployment.persistence.enabled}
${deployment.persistence.size ? `  size: "${deployment.persistence.size}"` : '  # size: "10Gi"'}
${deployment.persistence.mountPath ? `  mountPath: "${deployment.persistence.mountPath}"  # Choix du répertoire à persister` : '  # mountPath: "/data"'}

# Configuration du nombre de replicas
replicaCount: ${deployment.replicaCount}

# Configuration des ports
ports:
  http: ${deployment.ports.http}
  https: ${deployment.ports.https}

# Labels et sélecteurs additionnels
labels: ${Object.keys(deployment.labels).length > 0 ? yaml.dump(deployment.labels).trim() : '{}'}
annotations: ${Object.keys(deployment.annotations).length > 0 ? yaml.dump(deployment.annotations).trim() : '{}'}
`;

    return yamlContent;
  }

  /**
   * Create a new deployment
   */
  async createDeployment(
    dto: CreateDeploymentDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetDeploymentDto> {
    // Verify project exists and belongs to organization
    const project =
      await this.projectsRepository.findByProjectAndOrganizationId(
        dto.projectId,
        user.currentOrganization.id,
      );

    // Check if deployment already exists for this project
    const existingDeployment =
      await this.deploymentsRepository.findByOrganizationAndProject(
        user.currentOrganization.id,
        dto.projectId,
      );

    if (existingDeployment) {
      throw new BadRequestException(
        'Deployment already exists for this project',
      );
    }

    // Create deployment domain
    const domain = DeploymentDomain.create(
      dto,
      user.currentOrganization.id,
      dto.projectId,
    );

    this.logger.log(
      `Creating deployment for ${domain.organizationName}/${domain.projectName}`,
    );

    // Generate YAML content
    const yamlContent = this.generateValuesYaml(domain);

    try {
      // Push to GitHub
      await this.githubService.pushValuesYaml(
        domain.organizationName,
        domain.projectName,
        yamlContent,
      );

      // Save deployment to database
      const deployment = await this.deploymentsRepository.create(domain);

      // Update status to deployed
      const updatedDeployment = await this.deploymentsRepository.updateStatus(
        deployment._id.toString(),
        'deployed',
      );

      this.logger.log(
        `Deployment created successfully at ${domain.githubPath}`,
      );

      return this.deploymentMapper.toGetDeploymentDto(updatedDeployment);
    } catch (error) {
      this.logger.error('Failed to create deployment:', error);

      // Save deployment with failed status
      const deployment = await this.deploymentsRepository.create(domain);
      await this.deploymentsRepository.updateStatus(
        deployment._id.toString(),
        'failed',
      );

      throw error;
    }
  }

  /**
   * Get deployment by ID
   */
  async getDeploymentById(
    deploymentId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<GetDeploymentDto> {
    const deployment = await this.deploymentsRepository.findById(deploymentId);

    // Verify deployment belongs to user's organization
    if (deployment.organizationId !== user.currentOrganization.id) {
      throw new NotFoundException('Deployment not found');
    }

    return this.deploymentMapper.toGetDeploymentDto(deployment);
  }

  /**
   * Get all deployments for the current organization
   */
  async getDeployments(
    user: LogtoUserWithOrganizations,
  ): Promise<GetDeploymentLightDto[]> {
    const deployments = await this.deploymentsRepository.findByOrganizationId(
      user.currentOrganization.id,
    );

    return deployments.map(this.deploymentMapper.toGetDeploymentLightDto);
  }

  /**
   * Get deployments for a specific project
   */
  async getDeploymentsByProject(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<GetDeploymentLightDto[]> {
    // Verify project belongs to organization
    await this.projectsRepository.findByProjectAndOrganizationId(
      projectId,
      user.currentOrganization.id,
    );

    const deployments =
      await this.deploymentsRepository.findByProjectId(projectId);

    return deployments.map(this.deploymentMapper.toGetDeploymentLightDto);
  }

  /**
   * Update an existing deployment
   */
  async updateDeployment(
    deploymentId: string,
    dto: CreateDeploymentDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetDeploymentDto> {
    // Find existing deployment
    const existingDeployment =
      await this.deploymentsRepository.findById(deploymentId);

    // Verify deployment belongs to user's organization
    if (existingDeployment.organizationId !== user.currentOrganization.id) {
      throw new NotFoundException('Deployment not found');
    }

    // Verify project exists and belongs to organization
    await this.projectsRepository.findByProjectAndOrganizationId(
      dto.projectId,
      user.currentOrganization.id,
    );

    // Create updated domain
    const domain = DeploymentDomain.create(
      dto,
      user.currentOrganization.id,
      dto.projectId,
    );

    this.logger.log(
      `Updating deployment for ${domain.organizationName}/${domain.projectName}`,
    );

    // Generate YAML content
    const yamlContent = this.generateValuesYaml(domain);

    try {
      // Push to GitHub
      await this.githubService.pushValuesYaml(
        domain.organizationName,
        domain.projectName,
        yamlContent,
      );

      // Update deployment in database
      const updatedDeployment = await this.deploymentsRepository.update(
        deploymentId,
        domain,
      );

      // Update status to deployed
      const finalDeployment = await this.deploymentsRepository.updateStatus(
        deploymentId,
        'deployed',
      );

      this.logger.log(
        `Deployment updated successfully at ${domain.githubPath}`,
      );

      return this.deploymentMapper.toGetDeploymentDto(finalDeployment);
    } catch (error) {
      this.logger.error('Failed to update deployment:', error);

      // Update status to failed
      await this.deploymentsRepository.updateStatus(deploymentId, 'failed');

      throw error;
    }
  }

  /**
   * Delete a deployment
   */
  async deleteDeployment(
    deploymentId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<void> {
    const deployment = await this.deploymentsRepository.findById(deploymentId);

    // Verify deployment belongs to user's organization
    if (deployment.organizationId !== user.currentOrganization.id) {
      throw new NotFoundException('Deployment not found');
    }

    this.logger.log(`Deleting deployment at ${deployment.githubPath}`);

    try {
      // Delete from GitHub
      await this.githubService.deleteFile(
        deployment.githubPath,
        `Delete ${deployment.projectName} deployment for ${deployment.organizationName}`,
      );
    } catch (error) {
      this.logger.error('Failed to delete from GitHub:', error);
      // Continue with database deletion even if GitHub deletion fails
    }

    // Delete from database
    await this.deploymentsRepository.delete(deploymentId);

    this.logger.log('Deployment deleted successfully');
  }
}
