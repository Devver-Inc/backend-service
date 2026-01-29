import { GetPositionDto } from 'src/_utils/dto/responses/get-position.dto';

export class GetCommentDto {
  id: string;
  userId: string;
  content: string;
  position: GetPositionDto;
}
