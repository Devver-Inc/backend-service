import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ChangeDatabaseSizeDto,
  DatabaseConfigurationDto,
} from './_utils/dto/requests/database-configuration.dto';
import {
  DatabaseCatalogResponseDto,
  DatabaseCredentialsResponseDto,
} from './_utils/dto/responses/database-configuration-response.dto';
import { DatabaseType } from './project.types';
import { DatabasesService } from './databases.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiResponseDecorator } from 'src/_utils/decorators/api-response.decorator';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { ConnectedUserWithOrgs } from 'src/logto/_utils/decorator/connected-user.decorator';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { AddTeamMembersDto } from './_utils/dto/requests/add-team-members.dto';
import { CreateProjectDto } from './_utils/dto/requests/create-project.dto';
import { UpdateProjectDto } from './_utils/dto/requests/update-project.dto';
import { ProjectsPaginatedQueryDto } from './_utils/dto/query/projects-paginated-query.dto';
import { GetProjectDto } from './_utils/dto/responses/get-project.dto';
import { GetProjectLightDto } from './_utils/dto/responses/get-project-light.dto';
import { ProjectsService } from './projects.service';
import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';
import { Public } from 'src/logto/_utils/decorator/public.decorator';
import { OverlayAccessControlResponseDto } from './_utils/dto/responses/overlay-access-control-response.dto';
import { ProjectParamsDto } from 'src/deploy-agent/_utils/dto/requests/agent-params.dto';

@ApiTags('Databases')
@Controller('databases')
export class DatabasesController {
  constructor(private readonly databasesService: DatabasesService) {}

  @Protect()
  @Get('catalog')
  @ApiOperation({
    summary: 'Database versions offered to new databases, and the sizes',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [DatabaseCatalogResponseDto] })
  getCatalog(): DatabaseCatalogResponseDto[] {
    return this.databasesService.catalog();
  }
}

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly databasesService: DatabasesService,
  ) {}

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetProjectLightDto> {
    return this.projectsService.createProject(createProjectDto, user);
  }

  @Protect()
  @Get()
  @ApiOperation({ summary: 'List all projects in current organization' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponseDecorator(GetProjectLightDto)
  async getProjects(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Query() query: ProjectsPaginatedQueryDto,
  ): Promise<PaginationDto<GetProjectLightDto[]>> {
    return this.projectsService.getProjects(user, query);
  }

  @Public()
  @Get(':projectId/overlay-access')
  @ApiOperation({
    summary: "Who may comment on the project's previews (read by the overlay)",
  })
  @ApiResponse({ status: HttpStatus.OK, type: OverlayAccessControlResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'PROJECT_NOT_FOUND',
  })
  getOverlayAccess(
    @Param() { projectId }: ProjectParamsDto,
  ): Promise<OverlayAccessControlResponseDto> {
    return this.projectsService.getOverlayAccess(projectId);
  }

  @Protect()
  @Get(':projectId')
  @ApiParam({ name: 'projectId', type: String })
  @ApiOperation({ summary: 'Get project details' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'PROJECT_NOT_FOUND',
  })
  async getProjectById(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    return this.projectsService.getProjectById(projectId, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Patch(':projectId')
  @ApiParam({ name: 'projectId', type: String })
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'PROJECT_NOT_FOUND',
  })
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

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete(':projectId')
  @HttpCode(204)
  @ApiParam({ name: 'projectId', type: String })
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'PROJECT_NOT_FOUND',
  })
  async deleteProject(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<void> {
    return this.projectsService.deleteProject(projectId, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Post(':projectId/databases')
  @ApiParam({ name: 'projectId', type: String })
  @ApiOperation({
    summary: 'Add a database (credentials generated, resources from the size)',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'DATABASE_ALREADY_EXISTS',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'DATABASE_VERSION_NOT_SUPPORTED',
  })
  async addDatabase(
    @Param('projectId') projectId: string,
    @Body() dto: DatabaseConfigurationDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    return this.projectsService.addDatabase(projectId, dto, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Patch(':projectId/databases/:type')
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'type', enum: DatabaseType })
  @ApiOperation({
    summary: "Change a database's size (CPU and memory; the disk stays)",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'DATABASE_NOT_ENABLED',
  })
  async changeDatabaseSize(
    @Param('projectId') projectId: string,
    @Param('type', new ParseEnumPipe(DatabaseType)) type: DatabaseType,
    @Body() dto: ChangeDatabaseSizeDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    return this.projectsService.changeDatabaseSize(
      projectId,
      type,
      dto.size,
      user,
    );
  }

  @Protect()
  @Get(':projectId/databases/:type/credentials')
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'type', enum: DatabaseType })
  @ApiOperation({
    summary:
      'Login of a database, for a connection through the tunnel (WebSocket on .../tunnel)',
  })
  @ApiResponse({ status: HttpStatus.OK, type: DatabaseCredentialsResponseDto })
  async getDatabaseCredentials(
    @Param('projectId') projectId: string,
    @Param('type', new ParseEnumPipe(DatabaseType)) type: DatabaseType,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<DatabaseCredentialsResponseDto> {
    const project = await this.projectsService.assertProjectAccess(
      projectId,
      user,
    );
    return this.databasesService.login(project, type, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete(':projectId/databases/:type')
  @HttpCode(204)
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'type', enum: DatabaseType })
  @ApiOperation({ summary: 'Delete a database, its data and credentials' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'DATABASE_IN_USE: ready deployments still link it',
  })
  async removeDatabase(
    @Param('projectId') projectId: string,
    @Param('type', new ParseEnumPipe(DatabaseType)) type: DatabaseType,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<void> {
    return this.projectsService.removeDatabase(projectId, type, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Post(':projectId/members')
  @ApiParam({ name: 'projectId', type: String })
  @ApiOperation({ summary: 'Add team members to project' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'SOME_MEMBERS_NOT_IN_ORGANIZATION',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'PROJECT_NOT_FOUND',
  })
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

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete(':projectId/members/:userId')
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'userId', type: String })
  @ApiOperation({ summary: 'Remove team member from project' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'FORBIDDEN' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'USER_NOT_TEAM_MEMBER',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'PROJECT_NOT_FOUND',
  })
  async removeTeamMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetProjectDto> {
    return this.projectsService.removeTeamMember(projectId, userId, user);
  }
}
