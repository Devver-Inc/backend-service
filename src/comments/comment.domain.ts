// comment.domain.ts
import { Position } from 'src/_utils/schemas/position.schema';
import { CreateCommentDto } from './_utils/dto/requests/create-comment.dto';
import { CommentDocument } from './comments.schema';

interface CommentDomainProps {
  userId: string;
  organizationId: string;
  projectId: string;
  content: string;
  position?: Position;
}

export class CommentDomain {
  readonly userId: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly content: string;
  readonly position?: Position;

  private constructor(props: CommentDomainProps) {
    this.userId = props.userId;
    this.organizationId = props.organizationId;
    this.projectId = props.projectId;
    this.content = props.content;
    this.position = props.position;
  }

  static create(
    dto: CreateCommentDto,
    userId: string,
    organizationId: string,
    projectId: string,
  ): CommentDomain {
    return new CommentDomain({
      userId,
      organizationId,
      projectId,
      content: dto.content,
      position: dto.position as Position,
    });
  }

  static fromDocument(doc: CommentDocument): CommentDomain {
    return new CommentDomain({
      userId: doc.userId,
      organizationId: doc.organizationId,
      projectId: doc.projectId.toString(),
      content: doc.content,
      position: doc.position,
    });
  }

  isAuthor(userId: string): boolean {
    return this.userId === userId;
  }

  belongsToProject(projectId: string): boolean {
    return this.projectId === projectId;
  }
}
