import { Injectable } from '@nestjs/common';
import { toPaginatedDto } from 'src/_utils/pagination/pagination.mapper';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { UsersService } from 'src/users/users.service';

import { ProjectsService } from 'src/projects/projects.service';
import { CommentsPaginatedQueryDto } from './_utils/dto/query/comments-paginated-query.dto';
import { CreateCommentDto } from './_utils/dto/requests/create-comment.dto';
import { GetCommentDto } from './_utils/dto/responses/get-comment.dto';
import { CommentDomain } from './comment.domain';
import { ProjectDomain } from 'src/projects/project.domain';
import { CommentsMapper } from './comments.mapper';
import { CommentsExceptions } from './_utils/errors/comments-exceptions';
import { CommentsRepository } from './comments.repository';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly projectsService: ProjectsService,
    private readonly commentsMapper: CommentsMapper,
    private readonly usersService: UsersService,
    private readonly exceptions: CommentsExceptions,
  ) {}

  private findProject = (
    projectId: string,
    user: LogtoUserWithOrganizations | null,
  ) =>
    user
      ? this.projectsService.findByProjectAndOrganizationId(
          projectId,
          user.currentOrganization.id,
        )
      : this.projectsService.findProjectById(projectId);

  async getComments(
    user: LogtoUserWithOrganizations | null,
    query: CommentsPaginatedQueryDto,
    projectId: string,
  ): Promise<PaginationDto<GetCommentDto[]>> {
    const project = await this.findProject(projectId, user);

    const projectDomain = ProjectDomain.fromDocument(project);

    if (!projectDomain.authorizeRead(user?.id, user?.isAdmin ?? false)) {
      throw this.exceptions.COMMENT_ACCESS_DENIED;
    }

    const organizationId =
      user?.currentOrganization.id ?? project.organizationId;
    const { comments, totalCount } =
      await this.commentsRepository.findByOrganizationId(
        organizationId,
        query,
        projectId,
      );

    const userIds = comments.map((c) => c.userId).filter(Boolean) as string[];
    const usersMap = await this.usersService.findManyByIds(userIds);
    return toPaginatedDto(comments, query, totalCount, (comment) =>
      this.commentsMapper.toGetCommentDto(
        comment,
        comment.userId ? usersMap.get(comment.userId) : undefined,
      ),
    );
  }

  async createComment(
    user: LogtoUserWithOrganizations | null,
    dto: CreateCommentDto,
    projectId: string,
  ): Promise<GetCommentDto> {
    const project = await this.findProject(projectId, user);

    const projectDomain = ProjectDomain.fromDocument(project);
    const authorization = projectDomain.authorizeComment(
      user?.id,
      user?.isAdmin ?? false,
      dto.guestEmail,
    );

    if (!authorization.allowed) {
      throw this.exceptions.COMMENT_ACCESS_DENIED;
    }

    dto.guestEmail = authorization.emailToPersist;

    const organizationId =
      user?.currentOrganization?.id ?? project.organizationId;
    const domain = CommentDomain.create(
      dto,
      organizationId,
      projectId,
      user?.id,
    );
    const comment = await this.commentsRepository.create(domain);

    return this.commentsMapper.toGetCommentDto(comment, user ?? undefined);
  }
}
