import { ApiProperty } from '@nestjs/swagger';
import { OverlayCommentPermission } from 'src/projects/project.schema';

export class OverlayAccessControlResponseDto {
  @ApiProperty({ enum: OverlayCommentPermission })
  commentPermission: OverlayCommentPermission;
}
