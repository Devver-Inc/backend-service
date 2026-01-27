import { GetPositionDto } from 'src/_utils/dtos/responses/get-position.dto';

export class GetCommentDto {
  id: string;
  userId: string;
  content: string;
  position: GetPositionDto;
}
