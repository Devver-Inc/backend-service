import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { LogtoModule } from 'src/logto/logto.module';
import { UsersModule } from 'src/users/users.module';
import { ArgoCdRequests } from 'src/argocd/argocd.requests';
import { ProjectsExceptions } from './_utils/errors/projects-exceptions';
import { ProjectsMapper } from './project.mapper';
import { Project, ProjectSchema } from './project.schema';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    forwardRef(() => LogtoModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectsRepository,
    ProjectsMapper,
    ProjectsExceptions,
    ArgoCdRequests,
  ],
  exports: [ProjectsService, ProjectsMapper],
})
export class ProjectsModule {}
