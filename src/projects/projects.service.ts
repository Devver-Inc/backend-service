import { Injectable } from '@nestjs/common';
import { toPaginatedDto } from 'src/_utils/pagination/pagination.mapper';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { LogtoRequests } from 'src/logto/logto.requests';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { AddTeamMembersDto } from './_utils/dto/requests/add-team-members.dto';
import { CreateProjectDto } from './_utils/dto/requests/create-project.dto';
import { UpdateProjectDto } from './_utils/dto/requests/update-project.dto';
import { ProjectsPaginatedQueryDto } from './_utils/dto/query/projects-paginated-query.dto';
import {
  GetProjectDto,
  GetProjectLightDto,
} from './_utils/dto/responses/get-project.dto';
import { ProjectsExceptions } from './_utils/errors/projects-exceptions';
import { ProjectsMapper } from './project.mapper';
import { ProjectsRepository } from './projects.repository';
import { ProjectDocument } from './project.schema';
import { ProjectDomain } from './project.domain';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly projectsMapper: ProjectsMapper,
    private readonly logtoRequests: LogtoRequests,
    private readonly exceptions: ProjectsExceptions,
  ) {}

  async createProject(
    dto: CreateProjectDto,
    user: LogtoUserWithOrganizations,
  ): Promise<GetProjectLightDto> {
    const organizationId = user.currentOrganization.id;

    await this.validateTeamMembersInOrganization(
      organizationId,
      dto.teamMemberIds,
    );

    const domain = ProjectDomain.create(dto, organizationId, user.id);
    const project = await this.projectsRepository.create(domain);

    return this.projectsMapper.toProjectLightDto(project);
  }

  async getProjects(
    user: LogtoUserWithOrganizations,
    query: ProjectsPaginatedQueryDto,
  ): Promise<PaginationDto<GetProjectLightDto[]>> {
    const organizationId = user.currentOrganization.id;

    const { projects, totalCount } =
      await this.projectsRepository.findByOrganizationId(organizationId, query);

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

    return project;
  }

  private async validateTeamMembersInOrganization(
    organizationId: string,
    userIds?: string[],
  ): Promise<void> {
    if (!userIds?.length) return;

    const { members } = await this.logtoRequests.getOrganizationMembers(
      organizationId,
      {
        q: userIds.join(' '),
        page_size: userIds.length,
      },
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
      this.logtoRequests.getOrganizationMembers(project.organizationId, {
        q: project.teamMemberIds.join(' '),
        page_size: project.teamMemberIds.length,
      }),
    ]);

    return this.projectsMapper.toProjectDto(project, createdBy, teamMembers);
  }
}
