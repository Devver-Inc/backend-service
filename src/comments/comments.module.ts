import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsModule } from 'src/projects/projects.module';
import { CommentsController } from './comments.controller';
import { CommentsMapper } from './comments.mapper';
import { CommentsRepository } from './comments.repository';
import { Comment, CommentSchema } from './comments.schema';
import { CommentsService } from './comments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Comment.name,
        schema: CommentSchema,
      },
    ]),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsMapper, CommentsRepository],
})
export class CommentsModule {}
