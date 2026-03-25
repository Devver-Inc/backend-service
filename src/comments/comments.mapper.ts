import { Injectable } from '@nestjs/common';
import { DocOrLean } from 'src/_utils/types';
import { mapToGetPositionDto } from 'src/_utils/functions/map-to-get-position-dto.function';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { UsersMapper } from 'src/users/user.mapper';
import { GetCommentDto } from './_utils/dto/responses/get-comment.dto';
import { Comment } from './comments.schema';

@Injectable()
export class CommentsMapper {
  constructor(private readonly usersMapper: UsersMapper) {}

  toGetCommentDto = (
    comment: DocOrLean<Comment>,
    user?: LogtoUser,
  ): GetCommentDto => ({
    id: comment._id.toString(),
    author:
      comment.userId && user
        ? this.usersMapper.toUserLightDto(user)
        : {
            id: 'guest',
            email: comment.guestEmail ?? null,
            name: 'Guest',
            avatarUrl: null,
          },
    repo: comment.repo ?? null,
    branch: comment.branch ?? null,
    content: comment.content,
    position: comment.position ? mapToGetPositionDto(comment.position) : null,
    createdAt: comment.createdAt,
  });
}
