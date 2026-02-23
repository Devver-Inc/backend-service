import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import { ConnectedUserWithOrgs } from 'src/logto/_utils/decorator/connected-user.decorator';
import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { CreateDeploymentDto } from './_utils/dto/requests/create-deployment.dto';
import { DeploymentsService } from './deployments.service';

@ApiTags('Deployments')
@Controller('deployments')
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Post()
  @ApiOperation({ summary: 'Create a new deployment' })
  async createDeployment(
    @Body() createDeploymentDto: CreateDeploymentDto,
  ): Promise<{
    success: boolean;
    message: string;
    organizationName: string;
    projectName: string;
    path: string;
  }> {
    return this.deploymentsService.createDeployment(createDeploymentDto);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Put()
  @ApiOperation({ summary: 'Update an existing deployment' })
  async updateDeployment(
    @Body() updateDeploymentDto: CreateDeploymentDto,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<{
    success: boolean;
    message: string;
    organizationName: string;
    projectName: string;
    path: string;
  }> {
    return this.deploymentsService.updateDeployment(updateDeploymentDto);
  }

  @Protect({ roles: [UserRoleEnum.ADMIN] })
  @Delete(':organizationName/:projectName')
  @HttpCode(200)
  @ApiParam({ name: 'organizationName', type: String })
  @ApiParam({ name: 'projectName', type: String })
  @ApiOperation({ summary: 'Delete a deployment' })
  async deleteDeployment(
    @Param('organizationName') organizationName: string,
    @Param('projectName') projectName: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.deploymentsService.deleteDeployment(
      organizationName,
      projectName,
    );
  }

  @Protect()
  @Get(':organizationName/:projectName/exists')
  @ApiParam({ name: 'organizationName', type: String })
  @ApiParam({ name: 'projectName', type: String })
  @ApiOperation({ summary: 'Check if a deployment exists' })
  async checkDeploymentExists(
    @Param('organizationName') organizationName: string,
    @Param('projectName') projectName: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<{ exists: boolean }> {
    const exists = await this.deploymentsService.deploymentExists(
      organizationName,
      projectName,
    );
    return { exists };
  }
}
