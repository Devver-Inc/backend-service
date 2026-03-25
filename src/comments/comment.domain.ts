// comment.domain.ts
import { Position } from 'src/_utils/schemas/position.schema';
import { CreateCommentDto } from './_utils/dto/requests/create-comment.dto';
import { CommentDocument } from './comments.schema';

interface CommentDomainProps {
  userId?: string;
  organizationId: string;
  projectId: string;
  content: string;
  guestEmail?: string;
  repo?: string;
  branch?: string;
  position?: Position;
}

export class CommentDomain {
  readonly userId?: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly content: string;
  readonly repo?: string;
  readonly branch?: string;
  readonly guestEmail?: string;
  readonly position?: Position;

  private constructor(props: CommentDomainProps) {
    this.userId = props.userId;
    this.organizationId = props.organizationId;
    this.projectId = props.projectId;
    this.content = props.content;
    this.repo = props.repo;
    this.branch = props.branch;
    this.guestEmail = props.guestEmail;
    this.position = props.position;
  }

  static create(
    dto: CreateCommentDto,
    organizationId: string,
    projectId: string,
    userId?: string,
  ): CommentDomain {
    return new CommentDomain({
      userId,
      organizationId,
      projectId,
      content: dto.content,
      repo: dto.repo,
      branch: dto.branch,
      guestEmail: dto.guestEmail,
      position: dto.position as Position,
    });
  }

  static fromDocument(doc: CommentDocument): CommentDomain {
    return new CommentDomain({
      userId: doc.userId,
      organizationId: doc.organizationId,
      projectId: doc.projectId.toString(),
      content: doc.content,
      repo: doc.repo,
      branch: doc.branch,
      guestEmail: doc.guestEmail,
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
