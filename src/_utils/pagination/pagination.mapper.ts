import { PaginatedQueryDto } from './requests/paginated-query.dto';
import { PaginationDto } from './responses/pagination.dto';

export const toPaginatedDto = <T, K>(
  data: T[],
  paginatedQueryDto: PaginatedQueryDto,
  totalItemsCount: number,
  mapper: (item: T) => K,
): PaginationDto<K[]> => {
  const mappedData = data.map(mapper);
  return new PaginationDto(mappedData, paginatedQueryDto, totalItemsCount);
};
