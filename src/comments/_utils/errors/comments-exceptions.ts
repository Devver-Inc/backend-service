import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class CommentsExceptions {
  COMMENT_ACCESS_DENIED = new ForbiddenException('COMMENT_ACCESS_DENIED');
}
