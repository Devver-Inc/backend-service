import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toPaginatedDto } from 'src/_utils/pagination/pagination.mapper';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { GitHubService } from 'src/_shared/github/github.service';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { EncryptionService } from 'src/_utils/encryption/encryption.service';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { LogtoRequests } from 'src/logto/logto.requests';
import { ProjectsPaginatedQueryDto } from './_utils/dto/query/projects-paginated-query.dto';
import { AddTeamMembersDto } from './_utils/dto/requests/add-team-members.dto';
import { CreateProjectDto } from './_utils/dto/requests/create-project.dto';
import { UpdateProjectDto } from './_utils/dto/requests/update-project.dto';
import { GetProjectDto } from './_utils/dto/responses/get-project.dto';
import { GetProjectLightDto } from './_utils/dto/responses/get-project-light.dto';
import { ProjectsExceptions } from './_utils/errors/projects-exceptions';
import { ProjectDomain } from './project.domain';
import { ProjectsMapper } from './project.mapper';
import { ManifestStatus, ProjectDocument } from './project.schema';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly projectsMapper: ProjectsMapper,
    private readonly logtoRequests: LogtoRequests,
    private readonly exceptions: ProjectsExceptions,
    private readonly githubService: GitHubService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async createProject(
    dto: CreateProjectDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetProjectLightDto> {
    const organizationId = user.currentOrganization.id;
    const organizationName = user.currentOrganization.name;

    await this.validateTeamMembersInOrganization(
      organizationId,
      dto.teamMemberIds,
    );

    this.assertDatabaseRequestsAreValid(dto);

    const encryptedMongoRootPassword = dto.databaseConfiguration
      ? this.encryptionService.encryptString(
          dto.databaseConfiguration.rootPassword,
        )
      : undefined;
    const domain = ProjectDomain.create(
      dto,
      organizationId,
      user.id,
      organizationName,
      encryptedMongoRootPassword,
    );
    const project = await this.projectsRepository.create(domain);

    try {
      const devverSecret = this.configService.get('DEPLOY_AGENT', {
        infer: true,
      }).DEPLOY_AGENT_SECRET;
      const databaseConnectionString = dto.databaseConfiguration
        ? domain.buildDatabaseConnectionString(
            organizationName,
            dto.databaseConfiguration.rootPassword,
          )
        : undefined;
      const yamlContent = domain.toValuesYaml(
        organizationName,
        devverSecret,
        databaseConnectionString,
      );
      await this.githubService.pushValuesYaml(
        organizationName,
        dto.name,
        yamlContent,
      );

      await this.projectsRepository.updateDeploymentManifestStatus(
        project._id.toString(),
        ManifestStatus.PUSHED,
      );

      this.logger.log(
        `values.yaml pushed for project ${dto.name} (org: ${organizationName})`,
      );
    } catch (error) {
      this.logger.error('Failed to push values.yaml to GitHub:', error);
      await this.projectsRepository.updateDeploymentManifestStatus(
        project._id.toString(),
        ManifestStatus.FAILED,
      );
      if (dto.databaseConfiguration) {
        await this.projectsRepository.updateDatabaseManifestStatus(
          project._id.toString(),
          ManifestStatus.FAILED,
        );
      }
      return this.projectsMapper.toProjectLightDto(project);
    }

    if (dto.databaseConfiguration) {
      try {
        const mongoYamlContent = domain.toMongoValuesYaml(
          organizationName,
          dto.databaseConfiguration.rootPassword,
        );
        await this.githubService.pushMongoValuesYaml(
          organizationName,
          dto.name,
          mongoYamlContent,
        );
        await this.projectsRepository.updateDatabaseManifestStatus(
          project._id.toString(),
          ManifestStatus.PUSHED,
        );
        this.logger.log(
          `values-db.yaml pushed for project ${dto.name} (org: ${organizationName})`,
        );
      } catch (error) {
        this.logger.error('Failed to push values-db.yaml to GitHub:', error);
        await this.projectsRepository.updateDatabaseManifestStatus(
          project._id.toString(),
          ManifestStatus.FAILED,
        );
      }
    }

    return this.projectsMapper.toProjectLightDto(project);
  }

  findProjectById = (projectId: string): Promise<ProjectDocument> =>
    this.projectsRepository.findById(projectId);

  findByProjectAndOrganizationId = (
    projectId: string,
    organizationId: string,
  ): Promise<ProjectDocument> =>
    this.projectsRepository.findByProjectAndOrganizationId(
      projectId,
      organizationId,
    );

  async getProjects(
    user: LogtoUserWithOrganizations,
    query: ProjectsPaginatedQueryDto,
  ): Promise<PaginationDto<GetProjectLightDto[]>> {
    const organizationId = user.currentOrganization.id;

    const { projects, totalCount } = user.isAdmin
      ? await this.projectsRepository.findByOrganizationId(
          organizationId,
          query,
        )
      : await this.projectsRepository.findByOrganizationAndMember(
          organizationId,
          user.id,
          query,
        );

    return toPaginatedDto(
      projects,
      query,
      totalCount,
      this.projectsMapper.toProjectLightDto,
    );
  }

  async getProjectById(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    const project = await this.getProjectWithAccessCheck(projectId, user);
    return this.toFullProjectDto(project);
  }

  async updateProject(
    projectId: string,
    dto: UpdateProjectDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    const project = await this.getProjectWithAccessCheck(projectId, user);
    const updated = await this.updateAndSave(project, (d) => d.update(dto));

    try {
      const organizationName = user.currentOrganization.name;
      const domain = ProjectDomain.fromDocument(updated);
      const devverSecret = this.configService.get('DEPLOY_AGENT', {
        infer: true,
      }).DEPLOY_AGENT_SECRET;
      const databaseConnectionString = updated.databaseConfiguration
        ? domain.buildDatabaseConnectionString(
            organizationName,
            this.encryptionService.decryptString(
              updated.databaseConfiguration.rootPasswordEncrypted,
            ),
          )
        : undefined;
      await this.githubService.pushValuesYaml(
        organizationName,
        domain.name,
        domain.toValuesYaml(
          organizationName,
          devverSecret,
          databaseConnectionString,
        ),
      );
      this.logger.log(
        `values.yaml updated for project ${domain.name} (org: ${organizationName})`,
      );
    } catch (error) {
      this.logger.error('Failed to update values.yaml on GitHub:', error);
    }

    return this.toFullProjectDto(updated);
  }

  async deleteProject(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<void> {
    const project = await this.getProjectWithAccessCheck(projectId, user);
    const organizationName = user.currentOrganization.name;

    // Delete GitHub manifests first so a failure here aborts the operation
    // before the DB record is removed, keeping the two stores consistent.
    await this.githubService.deleteValuesYaml(organizationName, project.name);
    if (project.databaseConfiguration?.enabled) {
      await this.githubService.deleteMongoValuesYaml(
        organizationName,
        project.name,
      );
    }
    this.logger.log(
      `Deployment manifests deleted for project ${project.name} (org: ${organizationName})`,
    );

    await this.projectsRepository.deleteById(projectId);
  }

  async addTeamMembers(
    projectId: string,
    dto: AddTeamMembersDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    const organizationId = user.currentOrganization.id;
    const project = await this.getProjectWithAccessCheck(projectId, user);

    await this.validateTeamMembersInOrganization(organizationId, dto.userIds);

    const updated = await this.updateAndSave(project, (d) =>
      d.addTeamMembers(dto.userIds),
    );
    return this.toFullProjectDto(updated);
  }

  async removeTeamMember(
    projectId: string,
    userId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    const project = await this.getProjectWithAccessCheck(projectId, user);
    const domain = ProjectDomain.fromDocument(project);

    if (!domain.isTeamMember(userId)) {
      throw this.exceptions.USER_NOT_TEAM_MEMBER;
    }

    const updated = await this.updateAndSave(project, (d) =>
      d.removeTeamMember(userId),
    );
    return this.toFullProjectDto(updated);
  }

  async assertProjectAccess(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<ProjectDocument> {
    return this.getProjectWithAccessCheck(projectId, user);
  }

  private async getProjectWithAccessCheck(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<ProjectDocument> {
    const organizationId = user.currentOrganization.id;
    const project =
      await this.projectsRepository.findByProjectAndOrganizationId(
        projectId,
        organizationId,
      );
    const domain = ProjectDomain.fromDocument(project);

    if (!user.isAdmin && !domain.isTeamMember(user.id)) {
      throw this.exceptions.PROJECT_ACCESS_DENIED;
    }

    return project;
  }

  private async validateTeamMembersInOrganization(
    organizationId: string,
    userIds?: string[],
  ): Promise<void> {
    if (!userIds?.length) {
      return;
    }

    const { members } = await this.logtoRequests.getOrganizationMembers(
      organizationId,
      { page_size: 100 },
    );

    const foundIds = new Set(members.map((m) => m.id));
    const invalidIds = userIds.filter((id) => !foundIds.has(id));

    if (invalidIds.length > 0) {
      throw this.exceptions.SOME_MEMBERS_NOT_IN_ORGANIZATION;
    }
  }

  private async updateAndSave(
    project: ProjectDocument,
    updater: (domain: ProjectDomain) => ProjectDomain,
  ): Promise<ProjectDocument> {
    const domain = ProjectDomain.fromDocument(project);
    const updated = updater(domain);
    Object.assign(project, updated);
    return this.projectsRepository.save(project);
  }

  private async toFullProjectDto(
    project: ProjectDocument,
  ): Promise<GetProjectDto> {
    const [createdBy, { members: teamMembers }] = await Promise.all([
      this.logtoRequests.fetchUserSafe(project.createdBy),
      project.teamMemberIds.length
        ? this.logtoRequests
            .getOrganizationMembers(project.organizationId, { page_size: 100 })
            .then(({ members }) => ({
              members: members.filter((m) =>
                project.teamMemberIds.includes(m.id),
              ),
            }))
        : Promise.resolve({ members: [] }),
    ]);

    return this.projectsMapper.toProjectDto(project, createdBy, teamMembers);
  }

  private assertDatabaseRequestsAreValid(dto: CreateProjectDto): void {
    if (!dto.databaseConfiguration) {
      return;
    }

    if (dto.databaseConfiguration.ram < 0.5) {
      throw this.exceptions.INVALID_DATABASE_MEMORY_REQUEST;
    }

    if (dto.databaseConfiguration.cpuCores < 0.1) {
      throw this.exceptions.INVALID_DATABASE_CPU_REQUEST;
    }
  }
}
