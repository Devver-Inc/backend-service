import { IsIn, IsString } from 'class-validator';
import { Optional } from 'class-validator-extended';
import { PaginatedQueryDto } from 'src/_utils/pagination/requests/paginated-query.dto';

const ALLOWED_SORT_FIELDS = ['_id', 'name', 'createdAt', 'updatedAt'] as const;

export class ProjectsPaginatedQueryDto extends PaginatedQueryDto {
  @IsString()
  @Optional()
  search?: string;

  @IsIn(ALLOWED_SORT_FIELDS)
  @Optional()
  declare sortBy: (typeof ALLOWED_SORT_FIELDS)[number];
}
