import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponseDecorator } from 'src/_utils/decorators/api-response.decorator';
import { PaginationDto } from 'src/_utils/pagination/responses/pagination.dto';
import { OptionalConnectedUserWithOrgs } from 'src/logto/_utils/decorator/connected-user.decorator';
import { OptionalAccessTokenGuard } from 'src/logto/_utils/middleware/optional-access-token.guard';
import { LogtoUserWithOrganizations } from 'src/logto/_utils/types/user-with-organization.type';
import { CommentsPaginatedQueryDto } from './_utils/dto/query/comments-paginated-query.dto';
import { CreateCommentDto } from './_utils/dto/requests/create-comment.dto';
import { GetCommentDto } from './_utils/dto/responses/get-comment.dto';
import { CommentsService } from './comments.service';

@ApiBearerAuth()
@ApiTags('Comments')
@Controller('projects/:projectId/comments')
@UseGuards(OptionalAccessTokenGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get comments for a project' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'COMMENT_ACCESS_DENIED',
  })
  @ApiResponseDecorator(GetCommentDto)
  @ApiParam({ name: 'projectId', description: 'ID of the project' })
  async getComments(
    @OptionalConnectedUserWithOrgs() user: LogtoUserWithOrganizations | null,
    @Query() query: CommentsPaginatedQueryDto,
    @Param('projectId') projectId: string,
  ): Promise<PaginationDto<GetCommentDto[]>> {
    return this.commentsService.getComments(user, query, projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Create comment' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'COMMENT_ACCESS_DENIED',
  })
  @ApiParam({ name: 'projectId', description: 'ID of the project' })
  async createComment(
    @OptionalConnectedUserWithOrgs() user: LogtoUserWithOrganizations | null,
    @Param('projectId') projectId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<GetCommentDto> {
    return this.commentsService.createComment(user, dto, projectId);
  }
}
