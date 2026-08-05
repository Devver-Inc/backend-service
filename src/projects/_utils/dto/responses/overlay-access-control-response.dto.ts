import { ApiProperty } from '@nestjs/swagger';
import { OverlayCommentPermission } from 'src/projects/project.types';

export class OverlayAccessControlResponseDto {
  @ApiProperty({ enum: OverlayCommentPermission })
  commentPermission: OverlayCommentPermission;
}
