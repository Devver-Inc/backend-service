import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ProjectParamsDto } from './_utils/dto/requests/agent-params.dto';
import { AgentTokenGuard } from './_utils/guards/agent-token.guard';
import { ReconcileItem } from './_utils/types/agent.types';
import { DeployAgentService } from './deploy-agent.service';

/** Called by agents from inside the cluster, never by users. */
@ApiExcludeController()
@UseGuards(AgentTokenGuard)
@Controller('internal/projects/:projectId')
export class InternalController {
  constructor(private readonly deployAgentService: DeployAgentService) {}

  @Get('deployments')
  listDesiredDeployments(
    @Param() { projectId }: ProjectParamsDto,
  ): Promise<ReconcileItem[]> {
    return this.deployAgentService.listDesiredDeployments(projectId);
  }
}
