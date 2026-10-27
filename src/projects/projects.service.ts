import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toPaginatedDto } from 'src/_utils/pagination/pagination.mapper';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { GitHubService } from 'src/_shared/github/github.service';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { VaultService } from 'src/_shared/vault/vault.service';
import {
  agentToken,
  vaultPaths,
} from 'src/_utils/functions/project-keys.function';
import { DeployAgentService } from 'src/deploy-agent/deploy-agent.service';
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
import {
  DATABASE_CONNECTION_ENV,
  DatabaseLink,
  DatabaseType,
  ManifestStatus,
  OverlayAccessControl,
} from './project.types';
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
    private readonly vault: VaultService,
    private readonly yamlGenerator: ProjectValuesYamlGenerator,
    private readonly mongoProvider: MongoDbProvider,
    @Inject(forwardRef(() => DeployAgentService))
    private readonly deployAgentService: DeployAgentService,
  ) {}

  async createProject(
    dto: CreateProjectDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetProjectLightDto> {
    const organization = user.currentOrganization;

    await this.validateTeamMembersInOrganization(
      organization.id,
      dto.teamMemberIds,
    );

    this.assertDatabaseRequestsAreValid(dto);

    const project = await this.projectsRepository.create(
      ProjectDomain.create(dto, organization.id, user.id),
    );
    const projectId = project._id.toString();

    // The password exists only in this request: without Vault the project is unusable.
    const mongo = dto.databaseConfigurations?.find(
      (configuration) => configuration.type === DatabaseType.MONGO,
    );
    if (mongo) {
      await this.vault
        .write(vaultPaths.mongo(projectId), {
          rootUsername: mongo.username,
          rootPassword: mongo.password,
        })
        .catch(async (error: unknown) => {
          await this.projectsRepository.deleteById(projectId);
          throw error;
        });
    }

    if (!(await this.publishProjectManifest(project, organization))) {
      for (const configuration of project.databaseConfigurations ?? []) {
        await this.projectsRepository.updateDatabaseManifestStatus(
          projectId,
          configuration.name,
          ManifestStatus.FAILED,
        );
      }
      return this.projectsMapper.toProjectLightDto(project);
    }

    for (const configuration of project.databaseConfigurations ?? []) {
      try {
        await this.githubService.pushDatabaseValuesYaml(
          projectId,
          configuration.name,
          this.mongoProvider.generateValuesYaml(
            { id: projectId, name: project.name },
            configuration,
          ),
        );
        await this.projectsRepository.updateDatabaseManifestStatus(
          projectId,
          configuration.name,
          ManifestStatus.PUSHED,
        );
      } catch (error) {
        this.logger.error(
          `Failed to push values-${configuration.name}.yaml for project ${projectId}:`,
          error,
        );
        await this.projectsRepository.updateDatabaseManifestStatus(
          projectId,
          configuration.name,
          ManifestStatus.FAILED,
        );
      }
    }

    return this.projectsMapper.toProjectLightDto(project);
  }

  findProjectById = (projectId: string): Promise<ProjectDocument> =>
    this.projectsRepository.findById(projectId);

  getOverlayAccess = (projectId: string): Promise<OverlayAccessControl> =>
    this.projectsRepository
      .findById(projectId)
      .then(({ overlayAccessControl }) => ({
        commentPermission: overlayAccessControl.commentPermission,
      }));

  async resolveDatabaseLinks(
    project: ProjectDocument,
    databaseLinks: DatabaseLink[],
  ): Promise<Record<string, string>> {
    const resolvedLinks: Record<string, string> = {};

    for (const link of databaseLinks) {
      if (link.engine !== DatabaseType.MONGO) {
        throw this.exceptions.DATABASE_TYPE_NOT_SUPPORTED;
      }
      if (!this.isMongoEnabled(project)) {
        throw this.exceptions.DATABASE_NOT_ENABLED;
      }
      resolvedLinks[link.env] = await this.mongoConnectionString(
        project._id.toString(),
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

    await this.publishProjectManifest(updated, user.currentOrganization);

    return this.toFullProjectDto(updated);
  }

  async deleteProject(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<void> {
    await this.getProjectWithAccessCheck(projectId, user);
    await this.deleteProjectCascade(projectId);
  }

  /**
   * Manifests first: a failure aborts before anything else is gone. Removing
   * values.yaml deletes the Argo app and the p-<id> namespace with the agent.
   */
  async deleteProjectCascade(projectId: string): Promise<void> {
    const project = await this.projectsRepository.findById(projectId);
    for (const configuration of project.databaseConfigurations ?? []) {
      await this.githubService.deleteDatabaseValuesYaml(
        projectId,
        configuration.name,
      );
    }
    await this.githubService.deleteValuesYaml(projectId);

    await this.deployAgentService.deleteProjectState(projectId);
    await this.projectsRepository.deleteComments(projectId);
    await this.vault.delete(vaultPaths.agent(projectId));
    await this.vault.delete(vaultPaths.mongo(projectId));
    await this.projectsRepository.deleteById(projectId);
    this.logger.log(`Project ${projectId} deleted`);
  }

  async deleteOrganizationProjects(organizationId: string): Promise<void> {
    for (const projectId of await this.projectsRepository.findIdsByOrganization(
      organizationId,
    )) {
      await this.deleteProjectCascade(projectId);
    }
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

    const members =
      await this.logtoRequests.getAllOrganizationMembers(organizationId);

    const foundIds = new Set(members.map((m) => m.id));
    const invalidIds = userIds.filter((id) => !foundIds.has(id));

    if (invalidIds.length > 0) {
      throw this.exceptions.SOME_MEMBERS_NOT_IN_ORGANIZATION;
    }
  }

  private async publishProjectManifest(
    project: ProjectDocument,
    organization: { id: string; name: string },
  ): Promise<boolean> {
    const projectId = project._id.toString();
    try {
      const deployAgentConfig = this.configService.get('DEPLOY_AGENT', {
        infer: true,
      });
      await this.vault.write(vaultPaths.agent(projectId), {
        DEVVER_SECRET: agentToken(
          deployAgentConfig.DEPLOY_AGENT_SECRET,
          projectId,
        ),
        ...(this.isMongoEnabled(project) && {
          [DATABASE_CONNECTION_ENV[DatabaseType.MONGO]]:
            await this.mongoConnectionString(projectId),
        }),
      });
      await this.githubService.pushValuesYaml(
        projectId,
        this.yamlGenerator.generateAppValues(
          {
            id: projectId,
            name: project.name,
            machineConfiguration: project.machineConfiguration,
          },
          organization,
          {
            previewDomain: `preview.${deployAgentConfig.K8S_BASE_DOMAIN}`,
            sshHost: deployAgentConfig.GIT_SSH_HOST,
            backendUrl: deployAgentConfig.BACKEND_INTERNAL_URL,
          },
        ),
      );
      await this.projectsRepository.updateDeploymentManifestStatus(
        projectId,
        ManifestStatus.PUSHED,
      );
      this.logger.log(`values.yaml pushed for project ${projectId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to publish project ${projectId} (Vault or GitHub):`,
        error,
      );
      await this.projectsRepository.updateDeploymentManifestStatus(
        projectId,
        ManifestStatus.FAILED,
      );
      return false;
    }
  }

  private isMongoEnabled = (project: ProjectDocument): boolean =>
    Boolean(
      project.databaseConfigurations?.some(
        (configuration) =>
          configuration.type === DatabaseType.MONGO && configuration.enabled,
      ),
    );

  private async mongoConnectionString(
    projectId: string,
    database?: string,
  ): Promise<string> {
    const credentials = await this.vault.read(vaultPaths.mongo(projectId));
    if (!credentials) throw this.exceptions.DATABASE_NOT_ENABLED;
    return this.mongoProvider.buildConnectionString(
      projectId,
      credentials.rootUsername,
      credentials.rootPassword,
      database,
    );
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

  private async toFullProjectDto(
    project: ProjectDocument,
  ): Promise<GetProjectDto> {
    const [createdBy, { members: teamMembers }] = await Promise.all([
      this.logtoRequests.fetchUserSafe(project.createdBy),
      project.teamMemberIds.length
        ? this.logtoRequests
            .getAllOrganizationMembers(project.organizationId)
            .then((members) => ({
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
