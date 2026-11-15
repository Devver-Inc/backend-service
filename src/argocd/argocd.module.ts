import { Module } from '@nestjs/common';
import { DeployAgentModule } from 'src/deploy-agent/deploy-agent.module';
import { ProjectsModule } from 'src/projects/projects.module';
import { ArgoCdApiModule } from './argocd-api.module';
import { ArgoCdSseService } from './argocd-sse.service';
import { ArgocdController } from './argocd.controller';

@Module({
  imports: [ArgoCdApiModule, DeployAgentModule, ProjectsModule],
  controllers: [ArgocdController],
  providers: [ArgoCdSseService],
})
export class ArgocdModule {}
