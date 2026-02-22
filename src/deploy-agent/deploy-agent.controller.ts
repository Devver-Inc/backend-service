import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import { ConnectedUserWithOrgs } from 'src/logto/_utils/decorator/connected-user.decorator';
import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { CreateDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { CreateRepoDto } from './_utils/dto/requests/create-repo.dto';
import {
  GetDeploymentDto,
  GetLogsDto,
  RestoreResultDto,
} from './_utils/dto/responses/get-deployment.dto';
import { GetRepoDto } from './_utils/dto/responses/get-repo.dto';
import { DeployAgentService } from './deploy-agent.service';

@ApiTags('Deploy Agent')
@Controller('projects/:projectId')
export class DeployAgentController {
  constructor(private readonly deployAgentService: DeployAgentService) {}

  @Protect()
  @Get('repos')
  @ApiOperation({ summary: 'List repos for a project' })
  @ApiParam({ name: 'projectId', type: String })
  async listRepos(
    @Param('projectId') projectId: string,
  ): Promise<GetRepoDto[]> {
    return this.deployAgentService.listRepos(projectId);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('repos')
  @ApiOperation({ summary: 'Create a git repo in the deploy agent' })
  @ApiParam({ name: 'projectId', type: String })
  async createRepo(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: CreateRepoDto,
  ): Promise<GetRepoDto> {
    return this.deployAgentService.createRepo(
      projectId,
      user.currentOrganization.id,
      user.currentOrganization.name,
      dto,
    );
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete('repos/:name')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a repo and all its deployments' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'name', type: String })
  async deleteRepo(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Param('name') name: string,
  ): Promise<void> {
    return this.deployAgentService.deleteRepo(
      projectId,
      user.currentOrganization.name,
      name,
    );
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('deployments')
  @ApiOperation({ summary: 'Deploy a branch to the deploy agent' })
  @ApiParam({ name: 'projectId', type: String })
  async deploy(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: CreateDeploymentDto,
  ): Promise<GetDeploymentDto> {
    return this.deployAgentService.deploy(
      projectId,
      user.currentOrganization.id,
      user.currentOrganization.name,
      dto,
    );
  }

  @Protect()
  @Get('deployments')
  @ApiOperation({ summary: 'List all deployments for a project' })
  @ApiParam({ name: 'projectId', type: String })
  async listDeployments(
    @Param('projectId') projectId: string,
  ): Promise<GetDeploymentDto[]> {
    return this.deployAgentService.listDeployments(projectId);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Delete('deployments/:repo/:branch')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a deployment' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'repo', type: String })
  @ApiParam({ name: 'branch', type: String })
  async removeDeployment(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Param('repo') repo: string,
    @Param('branch') branch: string,
  ): Promise<void> {
    return this.deployAgentService.removeDeployment(
      projectId,
      user.currentOrganization.name,
      repo,
      branch,
    );
  }

  @Protect()
  @Get('deployments/:deploymentId/logs')
  @ApiOperation({ summary: 'Get logs for a deployment' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'deploymentId', type: String })
  async getLogs(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Param('deploymentId') deploymentId: string,
  ): Promise<GetLogsDto> {
    return this.deployAgentService.getLogs(
      projectId,
      user.currentOrganization.name,
      deploymentId,
    );
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Post('deploy-agent/restore')
  @ApiOperation({
    summary: 'Replay all repos and active deployments to a fresh deploy agent',
  })
  @ApiParam({ name: 'projectId', type: String })
  async restoreState(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<RestoreResultDto> {
    return this.deployAgentService.restoreState(
      projectId,
      user.currentOrganization.name,
    );
  }
}
