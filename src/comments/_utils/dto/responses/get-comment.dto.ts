import { ApiProperty } from '@nestjs/swagger';
import { GetPositionDto } from 'src/_utils/dto/responses/get-position.dto';

export class GetCommentDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  userId: string;

  @ApiProperty({ example: 'This looks great!' })
  content: string;

  @ApiProperty({ type: () => GetPositionDto })
  position: GetPositionDto;
}
