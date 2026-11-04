import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from 'src/logto/_utils/decorator/public.decorator';
import { PrepareReportDto } from './_utils/dto/requests/prepare-report.dto';
import {
  ProjectParamsDto,
  RepoParamsDto,
} from './_utils/dto/requests/agent-params.dto';
import { AgentTokenGuard } from './_utils/guards/agent-token.guard';
import { ReconcileItem } from './_utils/types/agent.types';
import { DeployAgentService } from './deploy-agent.service';

@ApiExcludeController()
@Public()
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

  @Post('repos/:name/prepare')
  @HttpCode(HttpStatus.NO_CONTENT)
  reportPrepare(
    @Param() { projectId, name }: RepoParamsDto,
    @Body() report: PrepareReportDto,
  ): Promise<void> {
    return this.deployAgentService.reportPrepare(projectId, name, report);
  }
}
