import { IsString } from 'class-validator';
import { Optional } from 'class-validator-extended';
import { PaginatedQueryDto } from 'src/_utils/pagination/requests/paginated-query.dto';

export class CommentsPaginatedQueryDto extends PaginatedQueryDto {
  @IsString()
  @Optional()
  search?: string;
}
