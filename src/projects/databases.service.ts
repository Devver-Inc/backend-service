import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ProjectDomain } from './project.domain';
import { GitHubService } from 'src/_shared/github/github.service';
import { VaultService } from 'src/_shared/vault/vault.service';
import { vaultPaths } from 'src/_utils/functions/project-keys.function';
import { DeployAgentService } from 'src/deploy-agent/deploy-agent.service';
import {
  DatabaseCatalogResponseDto,
  DatabaseCredentialsResponseDto,
} from './_utils/dto/responses/database-configuration-response.dto';
import { ProjectsExceptions } from './_utils/errors/projects-exceptions';
import { DATABASE_CATALOG, isOfferedVersion } from './database-catalog';
import {
  connectionString,
  databaseCredentials,
  databaseLogin,
  databasePort,
  databaseValuesYaml,
  isValidDatabaseName,
} from './infrastructure/database-engines';
import { ProjectDocument } from './project.schema';
import {
  DatabaseDeploymentConfig,
  DatabaseLink,
  DatabaseRequest,
  DatabaseSize,
  DatabaseType,
  ManifestStatus,
} from './project.types';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class DatabasesService {
  private readonly logger = new Logger(DatabasesService.name);

  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly exceptions: ProjectsExceptions,
    private readonly githubService: GitHubService,
    private readonly vault: VaultService,
    @Inject(forwardRef(() => DeployAgentService))
    private readonly deployAgentService: DeployAgentService,
  ) {}

  catalog = (): DatabaseCatalogResponseDto[] =>
    Object.values(DatabaseType).map((type) => {
      const catalog = DATABASE_CATALOG[type];
      return {
        type,
        defaultVersion: catalog.default,
        versions: Object.keys(catalog.versions).filter((version) =>
          isOfferedVersion(type, version),
        ),
        sizes: Object.values(DatabaseSize).map((size) => ({
          size,
          cpu: catalog.sizes[size].cpuMillis / 1000,
          memory: catalog.sizes[size].memory,
          disk: catalog.sizes[size].disk,
        })),
      };
    });

  assertOffered(request: DatabaseRequest): void {
    if (request.version && !isOfferedVersion(request.type, request.version)) {
      throw this.exceptions.DATABASE_VERSION_NOT_SUPPORTED;
    }
  }

  databaseOf(
    project: ProjectDocument,
    type: DatabaseType,
  ): DatabaseDeploymentConfig {
    const database = project.databaseConfigurations?.find(
      (d) => d.type === type && d.enabled,
    );
    if (!database) throw this.exceptions.DATABASE_NOT_ENABLED;
    return database;
  }

  writeCredentials = (projectId: string, type: DatabaseType): Promise<void> =>
    this.vault.write(
      vaultPaths.database(projectId, type),
      databaseCredentials(type),
    );

  async deleteCredentials(
    projectId: string,
    types: DatabaseType[],
  ): Promise<void> {
    for (const type of types) {
      await this.vault.delete(vaultPaths.database(projectId, type));
    }
  }

  /** A failure is recorded as the manifest status, not thrown. */
  async publish(
    projectId: string,
    database: DatabaseDeploymentConfig,
  ): Promise<void> {
    let status = ManifestStatus.PUSHED;
    try {
      await this.githubService.pushServiceValuesYaml(
        projectId,
        database.name,
        databaseValuesYaml(projectId, database),
      );
    } catch (error) {
      this.logger.error(
        `Failed to push services/${database.name}/values.yaml for project ${projectId}:`,
        error,
      );
      status = ManifestStatus.FAILED;
    }
    await this.projectsRepository.updateDatabaseManifestStatus(
      projectId,
      database.name,
      status,
    );
  }

  async unpublish(
    projectId: string,
    databases: DatabaseDeploymentConfig[],
  ): Promise<void> {
    for (const database of databases) {
      await this.githubService.deleteServiceValuesYaml(
        projectId,
        database.name,
      );
    }
  }

  async resolveLinks(
    project: ProjectDocument,
    links: DatabaseLink[],
  ): Promise<Record<string, string>> {
    const projectId = project._id.toString();
    const resolved: Record<string, string> = {};
    for (const link of links) {
      this.databaseOf(project, link.engine);
      if (!isValidDatabaseName(link.engine, link.database)) {
        throw this.exceptions.INVALID_DATABASE_NAME;
      }
      const credentials = await this.vaultCredentials(projectId, link.engine);
      // Postgres, unlike Mongo and Valkey, does not create a database on first use.
      if (link.engine === DatabaseType.POSTGRES) {
        await this.deployAgentService.createPostgresDatabase(
          projectId,
          link.database,
          connectionString(projectId, link.engine, credentials),
        );
      }
      resolved[link.env] = connectionString(
        projectId,
        link.engine,
        credentials,
        link.database,
      );
    }
    return resolved;
  }

  /** Reading a database's login or opening a tunnel: the same people who may deploy. */
  assertCanConnect(
    project: ProjectDocument,
    type: DatabaseType,
    user: LogtoUserWithOrganizations,
  ): void {
    const roles = user.selectedOrganizationRoles.map((role) => role.roleName);
    if (!ProjectDomain.from(project).canPush(user.id, roles)) {
      throw new ForbiddenException('PUSH_NOT_ALLOWED');
    }
    this.databaseOf(project, type);
  }

  async login(
    project: ProjectDocument,
    type: DatabaseType,
    user: LogtoUserWithOrganizations,
  ): Promise<DatabaseCredentialsResponseDto> {
    this.assertCanConnect(project, type, user);
    const login = databaseLogin(
      type,
      await this.vaultCredentials(project._id.toString(), type),
    );
    return {
      username: login.user,
      password: login.password,
      port: databasePort(type),
    };
  }

  private async vaultCredentials(
    projectId: string,
    type: DatabaseType,
  ): Promise<Record<string, string>> {
    const credentials = await this.vault.read(
      vaultPaths.database(projectId, type),
    );
    if (!credentials) throw this.exceptions.DATABASE_NOT_ENABLED;
    return credentials;
  }
}
