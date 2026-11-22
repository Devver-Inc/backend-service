import { isDeepStrictEqual } from 'node:util';
import { ArgoCdSyncService } from 'src/argocd/argocd-sync.service';
import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
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
  DatabaseLink,
  DatabaseSize,
  DatabaseType,
  ManifestStatus,
  OverlayAccessControl,
} from './project.types';
import { ProjectsRepository } from './projects.repository';
import { ProjectValuesYamlGenerator } from './infrastructure/project-values-yaml.generator';
import { DatabasesService } from './databases.service';
import { DatabaseConfigurationDto } from './_utils/dto/requests/database-configuration.dto';

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
    private readonly databases: DatabasesService,
    @Inject(forwardRef(() => DeployAgentService))
    private readonly deployAgentService: DeployAgentService,
    private readonly argoCdSync: ArgoCdSyncService,
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
    const databases = project.databaseConfigurations ?? [];

    // Without its credentials in Vault the project is unusable.
    try {
      for (const database of databases) {
        await this.databases.writeCredentials(projectId, database.type);
      }
    } catch (error) {
      // Vault is likely down too: keep the original error.
      await this.databases
        .deleteCredentials(
          projectId,
          databases.map((d) => d.type),
        )
        .catch(() => {});
      await this.projectsRepository.deleteById(projectId);
      throw error;
    }

    if (!(await this.publishProjectManifest(project, organization)).published) {
      for (const database of databases) {
        await this.projectsRepository.updateDatabaseManifestStatus(
          projectId,
          database.name,
          ManifestStatus.FAILED,
        );
      }
      return this.projectsMapper.toProjectLightDto(project);
    }

    for (const database of databases) {
      await this.databases.publish(projectId, database);
    }
    this.argoCdSync.projectPublished(projectId, {
      created: true,
      services: databases.map((database) => database.name),
      secretsChanged: false,
    });
    return this.projectsMapper.toProjectLightDto(project);
  }

  async addDatabase(
    projectId: string,
    request: DatabaseConfigurationDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    const project = await this.getProjectWithAccessCheck(projectId, user);
    if (project.databaseConfigurations?.some((d) => d.type === request.type)) {
      throw this.exceptions.DATABASE_ALREADY_EXISTS;
    }
    this.databases.assertOffered(request);

    await this.databases.writeCredentials(projectId, request.type);
    const updated = await this.updateAndSave(project, (d) =>
      d.addDatabase(request),
    ).catch(async (error: unknown) => {
      await this.databases
        .deleteCredentials(projectId, [request.type])
        .catch(() => {});
      throw error;
    });
    await this.databases.publish(
      projectId,
      this.databases.databaseOf(updated, request.type),
    );
    this.argoCdSync.projectPublished(projectId, {
      created: false,
      services: [request.type],
      secretsChanged: false,
    });
    return this.toFullProjectDto(updated);
  }

  async changeDatabaseSize(
    projectId: string,
    type: DatabaseType,
    size: DatabaseSize,
    user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    const project = await this.getProjectWithAccessCheck(projectId, user);
    const database = this.databases.databaseOf(project, type);
    const updated = await this.projectsRepository.updateDatabaseSize(
      projectId,
      database.name,
      size,
    );
    await this.databases.publish(
      projectId,
      this.databases.databaseOf(updated, type),
    );
    this.argoCdSync.projectPublished(projectId, {
      created: false,
      services: [type],
      secretsChanged: false,
    });
    return this.toFullProjectDto(updated);
  }

  async removeDatabase(
    projectId: string,
    type: DatabaseType,
    user: LogtoUserWithOrganizations,
  ): Promise<void> {
    const project = await this.getProjectWithAccessCheck(projectId, user);
    const database = this.databases.databaseOf(project, type);
    const linked = await this.deployAgentService.deploymentsLinkedTo(
      projectId,
      type,
    );
    if (linked.length) {
      throw new ConflictException({
        code: 'DATABASE_IN_USE',
        message: 'Ready deployments still link this database.',
        deploymentIds: linked,
      });
    }
    await this.databases.unpublish(projectId, [database]);
    await this.databases.deleteCredentials(projectId, [type]);
    await this.projectsRepository.removeDatabase(projectId, database.name);
  }

  findProjectById = (projectId: string): Promise<ProjectDocument> =>
    this.projectsRepository.findById(projectId);

  getOverlayAccess = (projectId: string): Promise<OverlayAccessControl> =>
    this.projectsRepository
      .findById(projectId)
      .then(({ overlayAccessControl }) => ({
        commentPermission: overlayAccessControl.commentPermission,
      }));

  resolveDatabaseLinks = (
    project: ProjectDocument,
    databaseLinks: DatabaseLink[],
  ): Promise<Record<string, string>> =>
    this.databases.resolveLinks(project, databaseLinks);

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

    const { published, secretsChanged } = await this.publishProjectManifest(
      updated,
      user.currentOrganization,
    );
    if (published) {
      this.argoCdSync.projectPublished(projectId, {
        created: false,
        services: [],
        secretsChanged,
      });
    }

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
    const databases = project.databaseConfigurations ?? [];
    await this.databases.unpublish(projectId, databases);
    await this.githubService.deleteValuesYaml(projectId);

    await this.deployAgentService.deleteProjectState(projectId);
    await this.projectsRepository.deleteComments(projectId);
    await this.vault.delete(vaultPaths.agent(projectId));
    await this.databases.deleteCredentials(
      projectId,
      databases.map((d) => d.type),
    );
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

  /** Vault first, then git (infra rule). `secretsChanged` tells an existing project's agent must restart. */
  private async publishProjectManifest(
    project: ProjectDocument,
    organization: { id: string; name: string },
  ): Promise<{ published: boolean; secretsChanged: boolean }> {
    const projectId = project._id.toString();
    try {
      const deployAgentConfig = this.configService.get('DEPLOY_AGENT', {
        infer: true,
      });
      // No connection string: the agent gets one with each /databases call,
      // so rotating a password never restarts it.
      const secrets = {
        DEVVER_SECRET: agentToken(
          deployAgentConfig.DEPLOY_AGENT_SECRET,
          projectId,
        ),
      };
      const previous = await this.vault.read(vaultPaths.agent(projectId));
      await this.vault.write(vaultPaths.agent(projectId), secrets);
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
            backendUrl: deployAgentConfig.BACKEND_INTERNAL_URL,
          },
        ),
      );
      await this.projectsRepository.updateDeploymentManifestStatus(
        projectId,
        ManifestStatus.PUSHED,
      );
      this.logger.log(`values.yaml pushed for project ${projectId}`);
      return {
        published: true,
        secretsChanged: !isDeepStrictEqual(previous ?? {}, secrets),
      };
    } catch (error) {
      this.logger.error(
        `Failed to publish project ${projectId} (Vault or GitHub):`,
        error,
      );
      await this.projectsRepository.updateDeploymentManifestStatus(
        projectId,
        ManifestStatus.FAILED,
      );
      return { published: false, secretsChanged: false };
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
      this.databases.assertOffered(configuration);
    }
  }
}
