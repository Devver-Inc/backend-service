import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toPaginatedDto } from 'src/_utils/pagination/pagination.mapper';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { GitHubService } from 'src/_shared/github/github.service';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { LogtoRequests } from 'src/logto/logto.requests';
import { ProjectsPaginatedQueryDto } from './_utils/dto/query/projects-paginated-query.dto';
import { AddTeamMembersDto } from './_utils/dto/requests/add-team-members.dto';
import { CreateProjectDto } from './_utils/dto/requests/create-project.dto';
import { UpdateProjectDto } from './_utils/dto/requests/update-project.dto';
import {
  GetProjectDto,
  GetProjectLightDto,
} from './_utils/dto/responses/get-project.dto';
import { ProjectsExceptions } from './_utils/errors/projects-exceptions';
import { ProjectDomain } from './project.domain';
import { ProjectsMapper } from './project.mapper';
import { DeploymentStatus, ProjectDocument } from './project.schema';
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

    const domain = ProjectDomain.create(
      dto,
      organizationId,
      user.id,
      organizationName,
    );
    const project = await this.projectsRepository
      .create(domain)
      .catch((err: unknown) => {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: unknown }).code === 11000
        ) {
          throw this.exceptions.PROJECT_NAME_ALREADY_EXISTS;
        }
        throw err;
      });

    try {
      const devverSecret = this.configService.get('DEPLOY_AGENT', {
        infer: true,
      }).DEPLOY_AGENT_SECRET;
      const yamlContent = domain.toValuesYaml(organizationName, devverSecret);
      await this.githubService.pushValuesYaml(
        organizationName,
        dto.name,
        yamlContent,
      );

      await this.projectsRepository.updateDeploymentStatus(
        project._id.toString(),
        DeploymentStatus.DEPLOYED,
      );

      this.logger.log(
        `values.yaml pushed for project ${dto.name} (org: ${organizationName})`,
      );
    } catch (error) {
      this.logger.error('Failed to push values.yaml to GitHub:', error);
      await this.projectsRepository.updateDeploymentStatus(
        project._id.toString(),
        DeploymentStatus.FAILED,
      );
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
    return this.toFullProjectDto(updated);
  }

  async deleteProject(
    projectId: string,
    user: LogtoUserWithOrganizations,
  ): Promise<void> {
    await this.getProjectWithAccessCheck(projectId, user);
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
    const project = await this.projectsRepository.findById(projectId);
    const domain = ProjectDomain.fromDocument(project);

    if (!domain.belongsToOrganization(organizationId)) {
      throw this.exceptions.PROJECT_ACCESS_DENIED;
    }

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
}
