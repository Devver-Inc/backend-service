import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsModule } from 'src/projects/projects.module';
import { DeploymentMapper } from './deployment.mapper';
import { Deployment, DeploymentSchema } from './deployment.schema';
import { DeploymentsController } from './deployments.controller';
import { DeploymentsRepository } from './deployments.repository';
import { DeploymentsService } from './deployments.service';
import { GitHubService } from './github.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Deployment.name, schema: DeploymentSchema },
    ]),
    ProjectsModule,
  ],
  controllers: [DeploymentsController],
  providers: [
    DeploymentsService,
    DeploymentsRepository,
    DeploymentMapper,
    GitHubService,
  ],
  exports: [DeploymentsService, DeploymentsRepository],
})
export class DeploymentsModule {}
