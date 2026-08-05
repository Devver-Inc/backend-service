import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OverlayCommentPermission } from 'src/projects/project.types';

export class OverlayAccessControlDto {
  @ApiProperty({ enum: OverlayCommentPermission })
  @IsEnum(OverlayCommentPermission)
  commentPermission: OverlayCommentPermission;
}
