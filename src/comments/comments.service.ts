import { Injectable } from '@nestjs/common';
import { toPaginatedDto } from 'src/_utils/pagination/pagination.mapper';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { ProjectsRepository } from 'src/projects/projects.repository';
import { CommentsPaginatedQueryDto } from './_utils/dtos/query/comments-paginated-query.dto';
import { CreateCommentDto } from './_utils/dtos/requests/create-comment.dto';
import { GetCommentDto } from './_utils/dtos/responses/get-comment.dto';
import { CommentDomain } from './comment.domain';
import { CommentsMapper } from './comments.mapper';
import { CommentsRepository } from './comments.repository';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly commentsMapper: CommentsMapper,
  ) {}

  async getComments(
    user: LogtoUserWithOrganizations,
    query: CommentsPaginatedQueryDto,
    projectId: string,
  ): Promise<PaginationDto<GetCommentDto[]>> {
    await this.projectsRepository.findByProjectAndOrganizationId(
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
    await this.projectsRepository.findByProjectAndOrganizationId(
      projectId,
      user.currentOrganization.id,
    );

    const domain = CommentDomain.create(dto, user.id, projectId);
    const comment = await this.commentsRepository.create(domain);

    return this.commentsMapper.toGetCommentDto(comment);
  }
}
