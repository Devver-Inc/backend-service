import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { CommentsPaginatedQueryDto } from './_utils/dtos/query/comments-paginated-query.dto';
import { CommentDomain } from './comment.domain';
import { Comment, CommentDocument } from './comments.schema';

@Injectable()
export class CommentsRepository {
  NOT_FOUND_ERROR = 'COMMENT_NOT_FOUND';

  constructor(
    @InjectModel(Comment.name) private commentsModel: Model<Comment>,
  ) {}

  async create(domain: CommentDomain): Promise<CommentDocument> {
    return this.commentsModel.create(domain);
  }

  async findById(id: string): Promise<CommentDocument> {
    return this.commentsModel
      .findById(id)
      .orFail(new NotFoundException(this.NOT_FOUND_ERROR))
      .exec();
  }

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

  async save(comment: CommentDocument): Promise<CommentDocument> {
    return comment.save();
  }

  async deleteById(id: string): Promise<void> {
    await this.commentsModel.findByIdAndDelete(id).orFail().exec();
  }
}
