import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsModule } from 'src/projects/projects.module';
import { DeployAgentController } from './deploy-agent.controller';
import { DeployAgentMapper } from './deploy-agent.mapper';
import { DeployAgentRepository } from './deploy-agent.repository';
import { DeployAgentRequests } from './deploy-agent.requests';
import { DeployAgentService } from './deploy-agent.service';
import { Deployment, DeploymentSchema } from './schemas/deployment.schema';
import { DeployRepo, DeployRepoSchema } from './schemas/repo.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: DeployRepo.name, schema: DeployRepoSchema },
      { name: Deployment.name, schema: DeploymentSchema },
    ]),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [DeployAgentController],
  providers: [
    DeployAgentService,
    DeployAgentRepository,
    DeployAgentRequests,
    DeployAgentMapper,
  ],
})
export class DeployAgentModule {}
