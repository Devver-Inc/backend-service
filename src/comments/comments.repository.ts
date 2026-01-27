import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { CommentsPaginatedQueryDto } from './_utils/dtos/query/comments-paginated-query.dto';
import { CreateCommentDto } from './_utils/dtos/requests/create-comment.dto';
import { Comment, CommentDocument } from './comments.schema';

@Injectable()
export class CommentsRepository {
  constructor(
    @InjectModel(Comment.name) private commentsModel: Model<Comment>,
  ) {}

  async findByOrganizationId(
    organizationId: string,
    query: CommentsPaginatedQueryDto,
    projectId: string,
  ): Promise<{ comments: CommentDocument[]; totalCount: number }> {
    const { toMongoDbSort, skip, limit } = query;

    const filter: QueryFilter<Comment> = { organizationId };

    if (query.search) {
      filter.content = { $regex: query.search, $options: 'i' };
      filter.projectId = projectId;
    }

    const [comments, totalCount] = await Promise.all([
      this.commentsModel
        .find(filter)
        .sort(toMongoDbSort.$sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.commentsModel.countDocuments(filter).exec(),
    ]);

    return { comments, totalCount };
  }

  create = (
    user: LogtoUserWithOrganizations,
    dto: CreateCommentDto,
    projectId: string,
  ) =>
    this.commentsModel.create({
      userId: user.id,
      project: projectId,
      content: dto.content,
      position: dto.position,
    });
}
