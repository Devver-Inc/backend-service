import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogtoModule } from 'src/logto/logto.module';
import { UsersModule } from 'src/users/users.module';
import { DeployAgentModule } from 'src/deploy-agent/deploy-agent.module';
import { ProjectsExceptions } from './_utils/errors/projects-exceptions';
import { ProjectsMapper } from './project.mapper';
import { Project, ProjectSchema } from './project.schema';
import { Comment, CommentSchema } from 'src/comments/comments.schema';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';
import { ProjectValuesYamlGenerator } from './infrastructure/project-values-yaml.generator';
import { MongoDbProvider } from './infrastructure/database-provider/mongo.provider';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
    forwardRef(() => LogtoModule),
    forwardRef(() => UsersModule),
    forwardRef(() => DeployAgentModule),
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectsRepository,
    ProjectsMapper,
    ProjectsExceptions,
    ProjectValuesYamlGenerator,
    MongoDbProvider,
  ],
  exports: [ProjectsService, ProjectsMapper],
})
export class ProjectsModule {}
