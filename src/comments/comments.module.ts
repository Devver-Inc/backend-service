import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsModule } from 'src/projects/projects.module';
import { UsersModule } from 'src/users/users.module';
import { OptionalAccessTokenGuard } from 'src/logto/_utils/middleware/optional-access-token.guard';
import { CommentsController } from './comments.controller';
import { CommentsMapper } from './comments.mapper';
import { CommentsRepository } from './comments.repository';
import { Comment, CommentSchema } from './comments.schema';
import { CommentsExceptions } from './_utils/errors/comments-exceptions';
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
    UsersModule,
  ],
  controllers: [CommentsController],
  providers: [
    CommentsService,
    CommentsMapper,
    CommentsRepository,
    CommentsExceptions,
    OptionalAccessTokenGuard,
  ],
})
export class CommentsModule {}
