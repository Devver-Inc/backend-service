import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import { ConnectedUserWithOrgs } from 'src/logto/_utils/decorator/connected-user.decorator';
import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import {
  DeploymentActionParamsDto,
  DeploymentParamsDto,
  ProjectParamsDto,
  RepoParamsDto,
} from './_utils/dto/requests/agent-params.dto';
import { CreateAgentDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { CreateRepoDto } from './_utils/dto/requests/create-repo.dto';
import { ListDeploymentsQueryDto } from './_utils/dto/requests/list-deployments-query.dto';
import { GetAgentDeploymentDto } from './_utils/dto/responses/get-deployment.dto';
import { GetRepoDto } from './_utils/dto/responses/get-repo.dto';
import { DeployAgentService } from './deploy-agent.service';

@ApiTags('Deploy Agent')
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: 'PROJECT_ACCESS_DENIED',
})
@ApiResponse({
  status: HttpStatus.BAD_GATEWAY,
  description: 'The agent failed; body is its { code, message, logs? }',
})
@Controller('projects/:projectId')
export class DeployAgentController {
  constructor(private readonly deployAgentService: DeployAgentService) {}

  @Protect()
  @Get('repos')
  @ApiOperation({ summary: 'List repos for a project' })
  listRepos(
    @Param() { projectId }: ProjectParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetRepoDto[]> {
    return this.deployAgentService.listRepos(projectId, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('repos')
  @ApiOperation({ summary: 'Create a git repo in the deploy agent' })
  createRepo(
    @Param() { projectId }: ProjectParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: CreateRepoDto,
  ): Promise<GetRepoDto> {
    return this.deployAgentService.createRepo(projectId, dto, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete('repos/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a repo and all its deployments' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'REPO_NOT_FOUND' })
  deleteRepo(
    @Param() { projectId, name }: RepoParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<void> {
    return this.deployAgentService.deleteRepo(projectId, name, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('deployments')
  @ApiOperation({
    summary: 'Deploy a branch; streams the agent phases over SSE',
    description:
      'Errors before the deploy starts are JSON 4xx/5xx. Once the response is 200, the stream carries `phase` events and ends with `done` (the deployment) or `failed` ({ code, message, logs? }).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          example: 'event: phase\ndata: {"phase":"install"}\n\n',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'REPO_NOT_FOUND' })
  deploy(
    @Param() { projectId }: ProjectParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: CreateAgentDeploymentDto,
    @Res() response: Response,
  ): Promise<void> {
    return this.deployAgentService.deploy(projectId, dto, user, response);
  }

  @Protect()
  @Get('deployments')
  @ApiOperation({ summary: 'List the deployments running on the agent' })
  listDeployments(
    @Param() { projectId }: ProjectParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Query() query: ListDeploymentsQueryDto,
  ): Promise<GetAgentDeploymentDto[]> {
    return this.deployAgentService.listDeployments(projectId, user, query.repo);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Delete('deployments/:deploymentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a deployment' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'DEPLOYMENT_NOT_FOUND',
  })
  removeDeployment(
    @Param() { projectId, deploymentId }: DeploymentParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<void> {
    return this.deployAgentService.removeDeployment(
      projectId,
      deploymentId,
      user,
    );
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('deployments/:deploymentId/:action')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Start, stop or restart a deployment' })
  control(
    @Param() { projectId, deploymentId, action }: DeploymentActionParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<void> {
    return this.deployAgentService.control(
      projectId,
      deploymentId,
      action,
      user,
    );
  }

  @Protect()
  @Get('deployments/:deploymentId/logs')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({ summary: 'Last 200 log lines of a deployment' })
  getLogs(
    @Param() { projectId, deploymentId }: DeploymentParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<string> {
    return this.deployAgentService.getLogs(projectId, deploymentId, user);
  }
}
