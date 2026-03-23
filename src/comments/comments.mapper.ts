import { Injectable } from '@nestjs/common';
import { DocOrLean } from 'src/_utils/types';
import { mapToGetPositionDto } from 'src/_utils/functions/map-to-get-position-dto.function';
import { GetCommentDto } from './_utils/dto/responses/get-comment.dto';
import { Comment } from './comments.schema';

@Injectable()
export class CommentsMapper {
  toGetCommentDto = (comment: DocOrLean<Comment>): GetCommentDto => ({
    id: comment._id.toString(),
    userId: comment.userId,
    content: comment.content,
    position: comment.position ? mapToGetPositionDto(comment.position) : null,
  });
}
