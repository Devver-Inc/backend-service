import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiResponseDecorator } from 'src/_utils/decorators/api-response.decorator';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import { ConnectedUserWithOrgs } from 'src/logto/_utils/decorator/connected-user.decorator';
import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { CreateDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import {
  GetDeploymentDto,
  GetDeploymentLightDto,
} from './_utils/dto/responses/get-deployment.dto';
import { DeploymentsService } from './deployments.service';

@ApiTags('Deployments')
@Controller('deployments')
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Post()
  @ApiOperation({ summary: 'Create a new deployment' })
  @ApiResponseDecorator(GetDeploymentDto)
  async createDeployment(
    @Body() createDeploymentDto: CreateDeploymentDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetDeploymentDto> {
    return this.deploymentsService.createDeployment(createDeploymentDto, user);
  }

  @Protect()
  @Get()
  @ApiOperation({ summary: 'Get all deployments for current organization' })
  @ApiResponseDecorator(GetDeploymentLightDto)
  async getDeployments(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetDeploymentLightDto[]> {
    return this.deploymentsService.getDeployments(user);
  }

  @Protect()
  @Get('project/:projectId')
  @ApiParam({ name: 'projectId', type: String })
  @ApiOperation({ summary: 'Get deployments for a specific project' })
  @ApiResponseDecorator(GetDeploymentLightDto)
  async getDeploymentsByProject(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetDeploymentLightDto[]> {
    return this.deploymentsService.getDeploymentsByProject(projectId, user);
  }

  @Protect()
  @Get(':deploymentId')
  @ApiParam({ name: 'deploymentId', type: String })
  @ApiOperation({ summary: 'Get deployment by ID' })
  @ApiResponseDecorator(GetDeploymentDto)
  async getDeploymentById(
    @Param('deploymentId') deploymentId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetDeploymentDto> {
    return this.deploymentsService.getDeploymentById(deploymentId, user);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Patch(':deploymentId')
  @ApiParam({ name: 'deploymentId', type: String })
  @ApiOperation({ summary: 'Update an existing deployment' })
  @ApiResponseDecorator(GetDeploymentDto)
  async updateDeployment(
    @Param('deploymentId') deploymentId: string,
    @Body() updateDeploymentDto: CreateDeploymentDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<GetDeploymentDto> {
    return this.deploymentsService.updateDeployment(
      deploymentId,
      updateDeploymentDto,
      user,
    );
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete(':deploymentId')
  @HttpCode(204)
  @ApiParam({ name: 'deploymentId', type: String })
  @ApiOperation({ summary: 'Delete a deployment' })
  async deleteDeployment(
    @Param('deploymentId') deploymentId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<void> {
    return this.deploymentsService.deleteDeployment(deploymentId, user);
  }
}
