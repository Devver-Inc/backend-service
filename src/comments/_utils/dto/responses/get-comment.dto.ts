import { ApiProperty } from '@nestjs/swagger';
import { GetPositionDto } from 'src/_utils/dto/responses/get-position.dto';
import { GetUserLightDto } from 'src/users/_utils/dto/responses/get-user-light.dto';

export class GetCommentDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ type: () => GetUserLightDto, nullable: true })
  author: GetUserLightDto | null;

  @ApiProperty({ example: 'my-repo', nullable: true })
  repo: string | null;

  @ApiProperty({ example: 'main', nullable: true })
  branch: string | null;

  @ApiProperty({ example: 'This looks great!' })
  content: string;

  @ApiProperty({ type: () => GetPositionDto, nullable: true })
  position: GetPositionDto | null;

  @ApiProperty({ example: '2024-06-01T12:00:00Z' })
  createdAt: Date;
}
