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
  Put,
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
} from './_utils/dto/requests/agent-params.dto';
import { CreateAgentDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { InitProjectDto } from './_utils/dto/requests/init-project.dto';
import { MergeDeploymentsDto } from './_utils/dto/requests/merge-deployments.dto';
import { RenameDeploymentDto } from './_utils/dto/requests/rename-deployment.dto';
import { ListDeploymentsQueryDto } from './_utils/dto/requests/list-deployments-query.dto';
import { GetAgentDeploymentDto } from './_utils/dto/responses/get-deployment.dto';
import { InitProjectResponseDto } from './_utils/dto/responses/init-project-response.dto';
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

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('init')
  @ApiOperation({
    summary: 'devver init: get the push URL for this code',
    description:
      'Returns the repo whose root commit matches, or creates one with a generated name.',
  })
  initProject(
    @Param() { projectId }: ProjectParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: InitProjectDto,
  ): Promise<InitProjectResponseDto> {
    return this.deployAgentService.initProject(projectId, dto, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('deployments')
  @ApiOperation({
    summary: 'Deploy a commit as a new deployment; streams over SSE',
    description:
      'Every call creates a new deployment (as on the local server), unless the commit is already deployed for the service: unchanged (env and service) it is a 409 ALREADY_DEPLOYED with its { deploymentId, url }, otherwise that deployment is redeployed in place (same id and URL). With a `branch` whose URL now serves a newer deployment, the unchanged one takes the branch URL back instead of the 409 (rollback, no restart). Every process gets DEVVER_PREVIEW_ORIGIN_REGEX, matching every preview origin of the project (for CORS). Errors before the deploy starts are JSON 4xx/5xx. The stream starts with `deployment` ({ deploymentId, parentDeploymentId, secondParentDeploymentId, url, branchUrl, amended }), then `phase` events, and ends with `done` or `failed` ({ code, message, logs? }).',
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
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'ALREADY_DEPLOYED: { code, message, deploymentId, url }',
  })
  deploy(
    @Param() { projectId }: ProjectParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: CreateAgentDeploymentDto,
    @Res() response: Response,
  ): Promise<void> {
    return this.deployAgentService.deploy(projectId, dto, user, response);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('deployments/merge')
  @ApiOperation({
    summary:
      'Merge two ready deployments into a new one; streams like a deploy',
    description:
      'Rejected (400) for the same deployment, different repos, a deployment not ready or the same commit; 409 MERGE_CONFLICT or UNRELATED_HISTORIES from git. Both sources stay as they are.',
  })
  merge(
    @Param() { projectId }: ProjectParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: MergeDeploymentsDto,
    @Res() response: Response,
  ): Promise<void> {
    return this.deployAgentService.merge(projectId, dto, user, response);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Put('deployments/:deploymentId/name')
  @ApiOperation({ summary: 'Rename a deployment' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'DEPLOYMENT_NOT_FOUND',
  })
  renameDeployment(
    @Param() { projectId, deploymentId }: DeploymentParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: RenameDeploymentDto,
  ): Promise<{ displayName: string }> {
    return this.deployAgentService.renameDeployment(
      projectId,
      deploymentId,
      dto.displayName,
      user,
    );
  }

  @Protect()
  @Get('deployments')
  @ApiOperation({
    summary:
      'List every deployment of the project, oldest first, with its lineage',
  })
  listDeployments(
    @Param() { projectId }: ProjectParamsDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Query() query: ListDeploymentsQueryDto,
  ): Promise<GetAgentDeploymentDto[]> {
    return this.deployAgentService.listDeployments(
      projectId,
      user,
      query.rootCommit,
    );
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
