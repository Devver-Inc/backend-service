import {
  Controller,
  Header,
  HttpStatus,
  MessageEvent,
  Param,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Sse } from '@nestjs/common';
import { ArgoDeploymentStatusEvent } from './_utils/types/argocd.types';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import { ConnectedUserWithOrgs } from 'src/logto/_utils/decorator/connected-user.decorator';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ArgoCdSseService } from './argocd-sse.service';
import { DeployAgentService } from 'src/deploy-agent/deploy-agent.service';

@ApiTags('ArgoCD')
@Controller('projects/:projectId/argocd')
export class ArgocdController {
  constructor(
    private readonly deployAgentService: DeployAgentService,
    private readonly argoCdSseService: ArgoCdSseService,
  ) {}

  @Protect()
  @Sse('status/stream')
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  @ApiExtraModels(ArgoDeploymentStatusEvent)
  @ApiOperation({
    summary: 'SSE stream of ArgoCD deployment status for the project',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SSE stream of ArgoCD deployment status',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(ArgoDeploymentStatusEvent) },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'PROJECT_ACCESS_DENIED',
  })
  @ApiParam({ name: 'projectId', type: String })
  async watchArgoCdStatus(
    @Param('projectId') projectId: string,
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
  ): Promise<Observable<MessageEvent>> {
    const appName = await this.deployAgentService.getArgoAppName(
      projectId,
      user,
    );
    return this.argoCdSseService.watchStatus(appName);
  }
}
