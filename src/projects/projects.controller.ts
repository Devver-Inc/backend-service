import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiResponseDecorator } from 'src/_utils/decorators/api-response.decorator';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { ConnectedUserWithOrgs } from 'src/logto/_utils/decorator/connected-user.decorator';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { AddTeamMembersDto } from './_utils/dto/requests/add-team-members.dto';
import { CreateProjectDto } from './_utils/dto/requests/create-project.dto';
import { UpdateProjectDto } from './_utils/dto/requests/update-project.dto';
import { ProjectsPaginatedQueryDto } from './_utils/dto/query/projects-paginated-query.dto';
import {
  GetProjectDto,
  GetProjectLightDto,
} from './_utils/dto/responses/get-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Protect()
  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetProjectLightDto> {
    return this.projectsService.createProject(createProjectDto, user);
  }

  @Protect()
  @Get()
  @ApiOperation({ summary: 'List all projects in current organization' })
  @ApiResponseDecorator(GetProjectLightDto)
  async getProjects(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Query() query: ProjectsPaginatedQueryDto,
  ): Promise<PaginationDto<GetProjectLightDto[]>> {
    return this.projectsService.getProjects(user, query);
  }

  @Protect()
  @Get(':projectId')
  @ApiParam({ name: 'projectId', type: String })
  @ApiOperation({ summary: 'Get project details' })
  async getProjectById(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    return this.projectsService.getProjectById(projectId, user);
  }

  @Protect()
  @Patch(':projectId')
  @ApiParam({ name: 'projectId', type: String })
  @ApiOperation({ summary: 'Update project' })
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    return this.projectsService.updateProject(
      projectId,
      updateProjectDto,
      user,
    );
  }

  @Protect()
  @Delete(':projectId')
  @HttpCode(204)
  @ApiParam({ name: 'projectId', type: String })
  @ApiOperation({ summary: 'Delete project' })
  async deleteProject(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<void> {
    return this.projectsService.deleteProject(projectId, user);
  }

  @Protect()
  @Post(':projectId/members')
  @ApiParam({ name: 'projectId', type: String })
  @ApiOperation({ summary: 'Add team members to project' })
  async addTeamMembers(
    @Param('projectId') projectId: string,
    @Body() addTeamMembersDto: AddTeamMembersDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    return this.projectsService.addTeamMembers(
      projectId,
      addTeamMembersDto,
      user,
    );
  }

  @Protect()
  @Delete(':projectId/members/:userId')
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'userId', type: String })
  @ApiOperation({ summary: 'Remove team member from project' })
  async removeTeamMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    return this.projectsService.removeTeamMember(projectId, userId, user);
  }
}
