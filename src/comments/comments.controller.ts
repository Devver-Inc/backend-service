import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiResponseDecorator } from 'src/_utils/decorators/api-response.decorator';
import { Protect } from 'src/_utils/decorators/protect.decorator';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { ConnectedUserWithOrgs } from 'src/logto/_utils/decorator/connected-user.decorator';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { CommentsPaginatedQueryDto } from './_utils/dto/query/comments-paginated-query.dto';
import { CreateCommentDto } from './_utils/dto/requests/create-comment.dto';
import { GetCommentDto } from './_utils/dto/responses/get-comment.dto';
import { CommentsService } from './comments.service';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Protect()
  @Get(':projectId')
  @ApiOperation({ summary: 'Get comments for an project' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'COMMENT_ACCESS_DENIED',
  })
  @ApiResponseDecorator(GetCommentDto)
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
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'UNAUTHORIZED' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'COMMENT_ACCESS_DENIED',
  })
  @ApiParam({ name: 'projectId', description: 'ID of the project' })
  async createComment(
    @ConnectedUserWithOrgs() user: LogtoUserWithOrganizations,
    @Param('projectId') projectId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<GetCommentDto> {
    return this.commentsService.createComment(user, dto, projectId);
  }
}
