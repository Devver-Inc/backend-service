import { Injectable } from '@nestjs/common';
import { mapToGetPositionDto } from 'src/_utils/functions/map-to-get-position-dto.function';
import { GetCommentDto } from './_utils/dto/responses/get-comment.dto';
import { CommentLean } from './comments.repository';
import { CommentDocument } from './comments.schema';

@Injectable()
export class CommentsMapper {
  toGetCommentDto = (
    comment: CommentDocument | CommentLean,
  ): GetCommentDto => ({
    id: comment._id.toString(),
    userId: comment.userId,
    content: comment.content,
    position: mapToGetPositionDto(comment.position),
  });
}
