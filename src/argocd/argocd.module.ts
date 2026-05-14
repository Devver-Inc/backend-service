import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DeployAgentModule } from 'src/deploy-agent/deploy-agent.module';
import { ProjectsModule } from 'src/projects/projects.module';
import { ArgoCdRequests } from './argocd.requests';
import { ArgoCdSseService } from './argocd-sse.service';
import { ArgocdController } from './argocd.controller';

@Module({
  imports: [HttpModule, DeployAgentModule, ProjectsModule],
  controllers: [ArgocdController],
  providers: [ArgoCdRequests, ArgoCdSseService],
})
export class ArgocdModule {}
