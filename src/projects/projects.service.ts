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
import { ProjectDocument } from './project.schema';
import { DatabaseLink, DatabaseType, ManifestStatus } from './project.types';
import { ProjectsRepository } from './projects.repository';
import { ProjectValuesYamlGenerator } from './infrastructure/project-values-yaml.generator';
import { MongoDbProvider } from './infrastructure/database-provider/mongo.provider';

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
    private readonly yamlGenerator: ProjectValuesYamlGenerator,
    private readonly mongoProvider: MongoDbProvider,
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

    const encryptedDatabasePasswords = dto.databaseConfigurations
      ? new Map(
          dto.databaseConfigurations.map((configuration) => [
            configuration.type,
            this.encryptionService.encryptString(configuration.password),
          ]),
        )
      : undefined;
    const domain = ProjectDomain.create(
      dto,
      organizationId,
      user.id,
      organizationName,
      encryptedDatabasePasswords,
    );
    const project = await this.projectsRepository.create(domain);

    if (!(await this.publishProjectManifest(project, organizationName))) {
      for (const configuration of domain.databaseConfigurations ?? []) {
        await this.projectsRepository.updateDatabaseManifestStatus(
          project._id.toString(),
          configuration.name,
          ManifestStatus.FAILED,
        );
      }
      return this.projectsMapper.toProjectLightDto(project);
    }

    for (const configuration of domain.databaseConfigurations ?? []) {
      const requestConfiguration = dto.databaseConfigurations?.find(
        (candidate) => candidate.type === configuration.type,
      );
      if (!requestConfiguration) continue;

      try {
        const mongoYamlContent = this.mongoProvider.generateValuesYaml(
          organizationName,
          dto.name,
          {
            ...configuration,
            rootUsername: configuration.username,
            rootPassword: requestConfiguration.password,
          },
        );
        await this.githubService.pushDatabaseValuesYaml(
          organizationName,
          dto.name,
          configuration.name,
          mongoYamlContent,
        );
        await this.projectsRepository.updateDatabaseManifestStatus(
          project._id.toString(),
          configuration.name,
          ManifestStatus.PUSHED,
        );
        this.logger.log(
          `values-${configuration.name}.yaml pushed for project ${dto.name} (org: ${organizationName})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to push values-${configuration.name}.yaml to GitHub:`,
          error,
        );
        await this.projectsRepository.updateDatabaseManifestStatus(
          project._id.toString(),
          configuration.name,
          ManifestStatus.FAILED,
        );
      }
    }

    return this.projectsMapper.toProjectLightDto(project);
  }

  findProjectById = (projectId: string): Promise<ProjectDocument> =>
    this.projectsRepository.findById(projectId);

  async resolveDatabaseLinks(
    projectId: string,
    organizationName: string,
    databaseLinks: DatabaseLink[],
  ): Promise<Record<string, string> | undefined> {
    const project = await this.projectsRepository.findById(projectId);
    const resolvedLinks: Record<string, string> = {};

    for (const link of databaseLinks) {
      const databaseConfig = project.databaseConfigurations?.find(
        (configuration) =>
          configuration.type === link.engine && configuration.enabled,
      );
      if (!databaseConfig) return undefined;

      if (link.engine !== DatabaseType.MONGO) {
        throw this.exceptions.DATABASE_TYPE_NOT_SUPPORTED;
      }

      resolvedLinks[link.env] = this.mongoProvider.buildConnectionString(
        organizationName,
        project.name,
        databaseConfig.username,
        this.encryptionService.decryptString(databaseConfig.passwordEncrypted),
        link.database,
      );
    }

    return resolvedLinks;
  }

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

    await this.publishProjectManifest(updated, user.currentOrganization.name);

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
    for (const configuration of project.databaseConfigurations ?? []) {
      if (!configuration.enabled) continue;
      await this.githubService.deleteDatabaseValuesYaml(
        organizationName,
        project.name,
        configuration.name,
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
    const domain = ProjectDomain.from(project);

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
    const domain = ProjectDomain.from(project);

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

  private async publishProjectManifest(
    project: ProjectDocument,
    organizationName: string,
  ): Promise<boolean> {
    const projectId = project._id.toString();
    try {
      const deployAgentConfig = this.configService.get('DEPLOY_AGENT', {
        infer: true,
      });
      const databaseConnectionStrings = this.buildDatabaseConnectionStrings(
        project,
        organizationName,
      );
      await this.githubService.pushValuesYaml(
        organizationName,
        project.name,
        this.yamlGenerator.generateAppValues(
          organizationName,
          project.name,
          project.machineConfiguration,
          deployAgentConfig.DEPLOY_AGENT_SECRET,
          projectId,
          deployAgentConfig.GIT_AUTH_URL,
          databaseConnectionStrings,
        ),
      );
      await this.projectsRepository.updateDeploymentManifestStatus(
        projectId,
        ManifestStatus.PUSHED,
      );
      this.logger.log(
        `values.yaml pushed for project ${project.name} (org: ${organizationName})`,
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to push values.yaml to GitHub:', error);
      await this.projectsRepository.updateDeploymentManifestStatus(
        projectId,
        ManifestStatus.FAILED,
      );
      return false;
    }
  }

  private async updateAndSave(
    project: ProjectDocument,
    updater: (domain: ProjectDomain) => ProjectDomain,
  ): Promise<ProjectDocument> {
    const domain = ProjectDomain.from(project);
    const updated = updater(domain);
    Object.assign(project, updated);
    return this.projectsRepository.save(project);
  }

  private buildDatabaseConnectionStrings(
    project: ProjectDocument,
    organizationName: string,
  ): Partial<Record<DatabaseType, string>> {
    const mongoConfig = project.databaseConfigurations?.find(
      (configuration) =>
        configuration.type === DatabaseType.MONGO && configuration.enabled,
    );
    if (!mongoConfig) return {};

    return {
      [DatabaseType.MONGO]: this.mongoProvider.buildConnectionString(
        organizationName,
        project.name,
        mongoConfig.username,
        this.encryptionService.decryptString(mongoConfig.passwordEncrypted),
      ),
    };
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
    if (!dto.databaseConfigurations?.length) {
      return;
    }

    const types = new Set<DatabaseType>();
    for (const configuration of dto.databaseConfigurations) {
      if (types.has(configuration.type)) {
        throw this.exceptions.DUPLICATE_DATABASE_TYPE;
      }
      types.add(configuration.type);

      if (configuration.type !== DatabaseType.MONGO) {
        throw this.exceptions.DATABASE_TYPE_NOT_SUPPORTED;
      }
      if (configuration.ram < 0.5) {
        throw this.exceptions.INVALID_DATABASE_MEMORY_REQUEST;
      }
      if (configuration.cpuCores < 0.1) {
        throw this.exceptions.INVALID_DATABASE_CPU_REQUEST;
      }
    }
  }
}
