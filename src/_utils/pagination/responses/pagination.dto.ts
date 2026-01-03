import { PaginatedQueryDto } from '../requests/paginated-query.dto';

export class PaginationMetaDto {
  currentPage: number;
  totalItemsCount: number;
  totalPagesCount: number;
  itemsPerPage: number;
}

export class PaginationDto<T> {
  data: T;
  meta: PaginationMetaDto;
  constructor(
    data: T,
    paginatedQueryDto: PaginatedQueryDto,
    totalItemsCount: number,
  ) {
    this.data = data;
    this.meta = {
      currentPage: paginatedQueryDto.page,
      totalItemsCount,
      totalPagesCount: Math.ceil(totalItemsCount / paginatedQueryDto.pageSize),
      itemsPerPage: paginatedQueryDto.pageSize,
    };
  }
}
