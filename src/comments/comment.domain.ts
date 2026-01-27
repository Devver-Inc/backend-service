// comment.domain.ts
import { Position } from 'src/_utils/schemas/position.schema';
import { CreateCommentDto } from './_utils/dtos/requests/create-comment.dto';

interface CommentDomainProps {
  userId: string;
  projectId: string;
  content: string;
  position: Position;
}

export class CommentDomain {
  readonly userId: string;
  readonly projectId: string;
  readonly content: string;
  readonly position: Position;

  private constructor(props: CommentDomainProps) {
    Object.assign(this, props);
  }

  static create(
    dto: CreateCommentDto,
    userId: string,
    projectId: string,
  ): CommentDomain {
    return new CommentDomain({
      userId,
      projectId,
      content: dto.content,
      position: dto.position as Position,
    });
  }
}
