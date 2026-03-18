import { Injectable } from '@nestjs/common';
import { toPaginatedDto } from 'src/_utils/pagination/pagination.mapper';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
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
    private readonly exceptions: CommentsExceptions,
  ) {}

  async getComments(
    user: LogtoUserWithOrganizations,
    query: CommentsPaginatedQueryDto,
    projectId: string,
  ): Promise<PaginationDto<GetCommentDto[]>> {
    await this.projectsService.findByProjectAndOrganizationId(
      projectId,
      user.currentOrganization.id,
    );

    const { comments, totalCount } =
      await this.commentsRepository.findByOrganizationId(
        user.currentOrganization.id,
        query,
        projectId,
      );

    return toPaginatedDto(
      comments,
      query,
      totalCount,
      this.commentsMapper.toGetCommentDto,
    );
  }

  async createComment(
    user: LogtoUserWithOrganizations,
    dto: CreateCommentDto,
    projectId: string,
  ): Promise<GetCommentDto> {
    const project = await this.projectsService.findByProjectAndOrganizationId(
      projectId,
      user.currentOrganization.id,
    );

    const projectDomain = ProjectDomain.fromDocument(project);
    if (!projectDomain.canUserComment(user.id, user.isAdmin)) {
      throw this.exceptions.COMMENT_ACCESS_DENIED;
    }

    const domain = CommentDomain.create(
      dto,
      user.id,
      user.currentOrganization.id,
      projectId,
    );
    const comment = await this.commentsRepository.create(domain);

    return this.commentsMapper.toGetCommentDto(comment);
  }
}
