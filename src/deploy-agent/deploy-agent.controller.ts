import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  Res,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import { ConnectedUserWithOrgs } from 'src/logto/_utils/decorator/connected-user.decorator';
import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ControlPm2ProcessDto } from './_utils/dto/requests/control-pm2-process.dto';
import { CreateAgentDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { CreateRepoDto } from './_utils/dto/requests/create-repo.dto';
import { GenerateGitTokenDto } from './_utils/dto/requests/generate-git-token.dto';
import { ListDeploymentsQueryDto } from './_utils/dto/requests/list-deployments-query.dto';
import {
  ControlPm2ProcessResultDto,
  GetAgentDeploymentDto,
  GetLogsDto,
  RestoreResultDto,
} from './_utils/dto/responses/get-deployment.dto';
import { GetDatabaseDto } from './_utils/dto/responses/get-database.dto';
import { DatabaseType } from 'src/projects/project.types';
import { GetRepoDto } from './_utils/dto/responses/get-repo.dto';
import { GenerateGitTokenResult } from './_utils/types/git-authorization.types';
import { DeployAgentService } from './deploy-agent.service';
import { GitAuthorizationService } from './git-authorization.service';
import { parseGitAuthorizationRequest } from './_utils/functions/parse-git-authorization-request.function';

@ApiTags('Deploy Agent')
@Controller('projects/:projectId')
export class DeployAgentController {
  constructor(
    private readonly deployAgentService: DeployAgentService,
    private readonly gitAuthorizationService: GitAuthorizationService,
  ) {}

  @Protect()
  @Get('repos')
  @ApiOperation({ summary: 'List repos for a project' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiParam({ name: 'projectId', type: String })
  async listRepos(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetRepoDto[]> {
    return this.deployAgentService.listRepos(projectId, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('repos')
  @ApiOperation({ summary: 'Create a git repo in the deploy agent' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'REPO_CREATE_FAILED',
  })
  @ApiParam({ name: 'projectId', type: String })
  async createRepo(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: CreateRepoDto,
  ): Promise<GetRepoDto> {
    return this.deployAgentService.createRepo(projectId, dto, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete('repos/:name')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a repo and all its deployments' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'REPO_NOT_FOUND',
  })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'name', type: String })
  async deleteRepo(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Param('name') name: string,
  ): Promise<void> {
    return this.deployAgentService.deleteRepo(projectId, name, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('deployments')
  @ApiOperation({ summary: 'Deploy a branch to the deploy agent' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'VALIDATION_ERROR | INSTALL_ERROR | BUILD_ERROR | PROCESS_ERROR | NGINX_ERROR | PORT_CONFLICT | DEPLOY_ERROR',
  })
  @ApiParam({ name: 'projectId', type: String })
  async deploy(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: CreateAgentDeploymentDto,
  ): Promise<GetAgentDeploymentDto> {
    return this.deployAgentService.deploy(projectId, dto, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('deployments/stream')
  @ApiOperation({ summary: 'Deploy a branch and stream agent phases over SSE' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SSE stream with phase, complete, and error events',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          example:
            'event: phase\ndata: {"phase":"install","durationMs":18500}\n\n',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiParam({ name: 'projectId', type: String })
  async deployStream(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: CreateAgentDeploymentDto,
    @Res() response: Response,
  ): Promise<void> {
    return this.deployAgentService.deployStream(projectId, dto, user, response);
  }

  @Protect()
  @Get('deployments')
  @ApiOperation({ summary: 'List all deployments for a project' })
  @ApiQuery({ name: 'repo', required: false, type: String })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiParam({ name: 'projectId', type: String })
  async listDeployments(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Query() query: ListDeploymentsQueryDto,
  ): Promise<GetAgentDeploymentDto[]> {
    return this.deployAgentService.listDeployments(projectId, user, query.repo);
  }

  @Protect()
  @Get('databases/:engine')
  @ApiOperation({ summary: 'List databases created for a project by engine' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'DATABASE_NOT_ENABLED',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'DATABASE_INSTANCE_UNREACHABLE | DATABASES_FETCH_FAILED',
  })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'engine', enum: DatabaseType })
  async listDatabases(
    @Param('projectId') projectId: string,
    @Param('engine', new ParseEnumPipe(DatabaseType)) engine: DatabaseType,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetDatabaseDto[]> {
    return this.deployAgentService.listDatabases(projectId, engine, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Delete('deployments/:deploymentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a deployment' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'DEPLOYMENT_NOT_FOUND',
  })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'deploymentId', type: String })
  async removeDeployment(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Param('deploymentId') deploymentId: string,
  ): Promise<void> {
    return this.deployAgentService.removeDeployment(
      projectId,
      deploymentId,
      user,
    );
  }

  @Protect()
  @Get('deployments/:deploymentId/logs')
  @ApiOperation({ summary: 'Get logs for a deployment' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'deploymentId', type: String })
  async getLogs(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Param('deploymentId') deploymentId: string,
  ): Promise<GetLogsDto> {
    return this.deployAgentService.getLogs(projectId, deploymentId, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('pm2/start')
  @ApiOperation({ summary: 'Start a PM2 process by name' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'PM2_START_FAILED',
  })
  @ApiParam({ name: 'projectId', type: String })
  async startProcess(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: ControlPm2ProcessDto,
  ): Promise<ControlPm2ProcessResultDto> {
    return this.deployAgentService.startProcess(projectId, dto, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('pm2/stop')
  @ApiOperation({ summary: 'Stop a PM2 process by name' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'PM2_STOP_FAILED',
  })
  @ApiParam({ name: 'projectId', type: String })
  async stopProcess(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: ControlPm2ProcessDto,
  ): Promise<ControlPm2ProcessResultDto> {
    return this.deployAgentService.stopProcess(projectId, dto, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('pm2/restart')
  @ApiOperation({ summary: 'Restart a PM2 process by name' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'PM2_RESTART_FAILED',
  })
  @ApiParam({ name: 'projectId', type: String })
  async restartProcess(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: ControlPm2ProcessDto,
  ): Promise<ControlPm2ProcessResultDto> {
    return this.deployAgentService.restartProcess(projectId, dto, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('git-tokens')
  @ApiOperation({
    summary: 'Generate a short-lived Git push token scoped to this project',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiParam({ name: 'projectId', type: String })
  async generateGitToken(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: GenerateGitTokenDto,
  ): Promise<GenerateGitTokenResult> {
    return this.gitAuthorizationService.generateToken(
      projectId,
      dto.repo,
      user,
    );
  }

  @Post('git-authorize')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Authorize a Git HTTP request' })
  async authorizeGitRequest(
    @Param('projectId') projectId: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-git-token') token?: string,
    @Headers('x-original-uri') originalUri?: string,
  ): Promise<void> {
    const parsed = parseGitAuthorizationRequest(
      authorization,
      token,
      originalUri,
    );
    if (!parsed.token) throw new UnauthorizedException('Git token required');
    if (!parsed.repo) {
      throw new ForbiddenException('Invalid Git repository path');
    }
    await this.gitAuthorizationService.authorize(
      projectId,
      parsed.repo,
      parsed.token,
    );
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Post('restore')
  @ApiOperation({
    summary: 'Replay all repos and active deployments to a fresh deploy agent',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiParam({ name: 'projectId', type: String })
  async restoreState(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<RestoreResultDto> {
    return this.deployAgentService.restoreState(projectId, user);
  }
}
