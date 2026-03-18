import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
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
import { DeploymentDocument } from './deployment.schema';
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

  private async getDeploymentWithAccessCheck(
    deploymentId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<DeploymentDocument> {
    const deployment = await this.deploymentsRepository.findById(deploymentId);
    const domain = DeploymentDomain.fromDocument(deployment);
    if (!domain.belongsToOrganization(user.currentOrganization.id)) {
      throw this.exceptions.DEPLOYMENT_NOT_FOUND;
    }
    return deployment;
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
    const yamlContent = domain.toValuesYaml();

    try {
      // Push to GitHub
      await this.githubService.pushValuesYaml(
        domain.organizationName,
        domain.projectName,
        yamlContent,
      );

      // Save deployment to database
      const deployment = await this.deploymentsRepository.create(domain);
      const deployedDomain = DeploymentDomain.fromDocument(deployment).markAsDeployed();

      // Update status to deployed
      const updatedDeployment = await this.deploymentsRepository.updateStatus(
        deployment._id.toString(),
        deployedDomain.status,
      );

      this.logger.log(
        `Deployment created successfully at ${domain.githubPath}`,
      );

      return this.deploymentMapper.toGetDeploymentDto(updatedDeployment);
    } catch (error) {
      this.logger.error('Failed to create deployment:', error);

      // Save deployment with failed status
      const deployment = await this.deploymentsRepository.create(domain);
      const failedDomain = DeploymentDomain.fromDocument(deployment).markAsFailed();
      await this.deploymentsRepository.updateStatus(
        deployment._id.toString(),
        failedDomain.status,
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
    const deployment = await this.getDeploymentWithAccessCheck(
      deploymentId,
      user,
    );

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
    // Find existing deployment and verify access
    const existingDeployment = await this.getDeploymentWithAccessCheck(
      deploymentId,
      user,
    );

    // Verify project exists and belongs to organization
    await this.projectsService.findByProjectAndOrganizationId(
      dto.projectId,
      user.currentOrganization.id,
    );

    // Update domain preserving identity fields from the existing document
    const domain = DeploymentDomain.fromDocument(existingDeployment).update(dto);

    this.logger.log(
      `Updating deployment for ${domain.organizationName}/${domain.projectName}`,
    );

    // Generate YAML content
    const yamlContent = domain.toValuesYaml();

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
      const deployedDomain = domain.markAsDeployed();
      const finalDeployment = await this.deploymentsRepository.updateStatus(
        deploymentId,
        deployedDomain.status,
      );

      this.logger.log(
        `Deployment updated successfully at ${domain.githubPath}`,
      );

      return this.deploymentMapper.toGetDeploymentDto(finalDeployment);
    } catch (error) {
      this.logger.error('Failed to update deployment:', error);

      // Update status to failed
      const failedDomain = domain.markAsFailed();
      await this.deploymentsRepository.updateStatus(
        deploymentId,
        failedDomain.status,
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
    const deployment = await this.getDeploymentWithAccessCheck(
      deploymentId,
      user,
    );

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
