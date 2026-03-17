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
import { ControlPm2ProcessDto } from './_utils/dto/requests/control-pm2-process.dto';
import { CreateAgentDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { CreateRepoDto } from './_utils/dto/requests/create-repo.dto';
import {
  ControlPm2ProcessResultDto,
  GetAgentDeploymentDto,
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
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetRepoDto[]> {
    return this.deployAgentService.listRepos(projectId, user);
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
    return this.deployAgentService.createRepo(projectId, dto, user);
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
    return this.deployAgentService.deleteRepo(projectId, name, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Post('deployments')
  @ApiOperation({ summary: 'Deploy a branch to the deploy agent' })
  @ApiParam({ name: 'projectId', type: String })
  async deploy(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: CreateAgentDeploymentDto,
  ): Promise<GetAgentDeploymentDto> {
    return this.deployAgentService.deploy(projectId, dto, user);
  }

  @Protect()
  @Get('deployments')
  @ApiOperation({ summary: 'List all deployments for a project' })
  @ApiParam({ name: 'projectId', type: String })
  async listDeployments(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetAgentDeploymentDto[]> {
    return this.deployAgentService.listDeployments(projectId, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN, UserRoleEnum.DEVELOPER] })
  @Delete('deployments/:deploymentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a deployment' })
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
  @ApiParam({ name: 'projectId', type: String })
  async restartProcess(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Body() dto: ControlPm2ProcessDto,
  ): Promise<ControlPm2ProcessResultDto> {
    return this.deployAgentService.restartProcess(projectId, dto, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Post('restore')
  @ApiOperation({
    summary: 'Replay all repos and active deployments to a fresh deploy agent',
  })
  @ApiParam({ name: 'projectId', type: String })
  async restoreState(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<RestoreResultDto> {
    return this.deployAgentService.restoreState(projectId, user);
  }
}
