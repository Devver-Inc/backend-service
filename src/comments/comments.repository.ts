import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { escapeRegex } from 'src/_utils/functions/escape-regex.function';
import { CommentsPaginatedQueryDto } from './_utils/dto/query/comments-paginated-query.dto';
import { CommentDomain } from './comment.domain';
import { Comment, CommentDocument } from './comments.schema';
import { LeanWithMongoId } from 'src/_utils/types';

export type CommentLean = LeanWithMongoId<Comment>;

@Injectable()
export class CommentsRepository {
  NOT_FOUND_ERROR = 'COMMENT_NOT_FOUND';

  constructor(
    @InjectModel(Comment.name) private commentsModel: Model<Comment>,
  ) {}

  create = (domain: CommentDomain): Promise<CommentDocument> =>
    this.commentsModel.create(domain);

  findById = (id: string): Promise<CommentDocument> =>
    this.commentsModel
      .findById(id)
      .orFail(new NotFoundException(this.NOT_FOUND_ERROR))
      .exec();

  findByOrganizationId = async (
    organizationId: string,
    query: CommentsPaginatedQueryDto,
    projectId: string,
  ): Promise<{ comments: CommentLean[]; totalCount: number }> => {
    const { toMongoDbSort, skip, limit } = query;

    const filter: QueryFilter<Comment> = {
      organizationId,
      projectId: new Types.ObjectId(projectId),
      ...(query.search && {
        content: { $regex: escapeRegex(query.search), $options: 'i' },
      }),
    };

    const [comments, totalCount] = await Promise.all([
      this.commentsModel
        .find(filter)
        .sort(toMongoDbSort.$sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.commentsModel.countDocuments(filter).exec(),
    ]);

    return { comments, totalCount };
  };

  save = (comment: CommentDocument): Promise<CommentDocument> => comment.save();

  deleteById = async (id: string): Promise<void> => {
    await this.commentsModel
      .findByIdAndDelete(id)
      .orFail(new NotFoundException(this.NOT_FOUND_ERROR))
      .exec();
  };
}
