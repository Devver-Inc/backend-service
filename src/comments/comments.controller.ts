import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiResponseDecorator } from 'src/_utils/decorators/api-response.decorator';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { ConnectedUserWithOrgs } from 'src/logto/_utils/decorator/connected-user.decorator';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { GetProjectLightDto } from 'src/projects/_utils/dto/responses/get-project.dto';
import { CommentsPaginatedQueryDto } from './_utils/dtos/query/comments-paginated-query.dto';
import { CreateCommentDto } from './_utils/dtos/requests/create-comment.dto';
import { GetCommentDto } from './_utils/dtos/responses/get-comment.dto';
import { CommentsService } from './comments.service';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Protect()
  @Get(':projectId')
  @ApiOperation({ summary: 'Get comments for an project' })
  @ApiResponseDecorator(GetProjectLightDto)
  @ApiParam({ name: 'projectId', description: 'ID of the project' })
  async getComments(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Query() query: CommentsPaginatedQueryDto,
    @Param('projectId') projectId: string,
  ): Promise<PaginationDto<GetCommentDto[]>> {
    return this.commentsService.getComments(user, query, projectId);
  }

  @Protect()
  @Post(':projectId')
  @ApiOperation({ summary: 'Create comment' })
  @ApiParam({ name: 'commentId', description: 'ID of the comment' })
  async getCommentById(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Param('projectId') projectId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<GetCommentDto> {
    return this.commentsService.createComment(user, dto, projectId);
  }
}
