import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ProjectsService } from 'src/projects/projects.service';
import { CreateDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import {
  GetDeploymentDto,
  GetDeploymentLightDto,
} from './_utils/dto/responses/get-deployment.dto';
import { DeploymentDomain } from './deployment.domain';
import { DeploymentMapper } from './deployment.mapper';
import { DeploymentsRepository } from './deployments.repository';
import { DeploymentStatus } from './deployment.schema';
import { DeploymentsExceptions } from './_utils/errors/deployments-exceptions';
import { GitHubService } from './github.service';

@Injectable()
export class DeploymentsService {
  private readonly logger = new Logger(DeploymentsService.name);

  constructor(
    private readonly deploymentsRepository: DeploymentsRepository,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
    private readonly deploymentMapper: DeploymentMapper,
    private readonly githubService: GitHubService,
    private readonly exceptions: DeploymentsExceptions,
  ) {}

  /**
   * Generate values.yaml content from deployment domain
   */
  private generateValuesYaml(deployment: DeploymentDomain): string {
    const obj = {
      organization: {
        name: deployment.organizationName,
        domain: deployment.organizationDomain,
      },
      project: {
        name: deployment.projectName,
      },
      container: {
        image: deployment.container.image,
        port: deployment.container.port,
        type: deployment.container.type,
        command:
          deployment.container.command &&
          deployment.container.command.length > 0
            ? deployment.container.command
            : [],
        args:
          deployment.container.args && deployment.container.args.length > 0
            ? deployment.container.args
            : [],
      },
      resources: {
        requests: {
          memory: deployment.resources.requests.memory,
          cpu: deployment.resources.requests.cpu,
        },
        limits: {
          memory: deployment.resources.limits.memory,
          cpu: deployment.resources.limits.cpu,
        },
      },
      persistence: {
        enabled: deployment.persistence.enabled,
        ...(deployment.persistence.size
          ? { size: deployment.persistence.size }
          : {}),
        ...(deployment.persistence.mountPath
          ? { mountPath: deployment.persistence.mountPath }
          : {}),
      },
      replicaCount: deployment.replicaCount,
      ports: {
        http: deployment.ports.http,
        https: deployment.ports.https,
      },
      labels:
        Object.keys(deployment.labels).length > 0 ? deployment.labels : {},
      annotations:
        Object.keys(deployment.annotations).length > 0
          ? deployment.annotations
          : {},
    };

    return yaml.dump(obj);
  }

  /**
   * Create a new deployment
   */
  async createDeployment(
    dto: CreateDeploymentDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetDeploymentDto> {
    // Verify project exists and belongs to organization
    await this.projectsService.findByProjectAndOrganizationId(
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
      throw this.exceptions.DEPLOYMENT_ALREADY_EXISTS;
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
        DeploymentStatus.DEPLOYED,
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
        DeploymentStatus.FAILED,
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
      throw this.exceptions.DEPLOYMENT_NOT_FOUND;
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
    await this.projectsService.findByProjectAndOrganizationId(
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
      throw this.exceptions.DEPLOYMENT_NOT_FOUND;
    }

    // Verify project exists and belongs to organization
    await this.projectsService.findByProjectAndOrganizationId(
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
      await this.deploymentsRepository.update(deploymentId, domain);

      // Update status to deployed
      const finalDeployment = await this.deploymentsRepository.updateStatus(
        deploymentId,
        DeploymentStatus.DEPLOYED,
      );

      this.logger.log(
        `Deployment updated successfully at ${domain.githubPath}`,
      );

      return this.deploymentMapper.toGetDeploymentDto(finalDeployment);
    } catch (error) {
      this.logger.error('Failed to update deployment:', error);

      // Update status to failed
      await this.deploymentsRepository.updateStatus(
        deploymentId,
        DeploymentStatus.FAILED,
      );

      throw error;
    }
  }

  deleteByProject = (projectId: string): Promise<void> =>
    this.deploymentsRepository.deleteByProject(projectId);

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
      throw this.exceptions.DEPLOYMENT_NOT_FOUND;
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
