import { PaginatedQueryDto } from './requests/paginated-query.dto';
import { PaginationDto } from './responses/pagination.dto';

type AgnoPaginatedResponse<T> = {
  data: T[];
  meta: {
    total_items_count: number;
    current_page: number;
    total_pages_count: number;
    items_per_page: number;
  };
};

export const toPaginationDtoFromAgno = <AgnoType, DtoType>(
  agnoResponse: AgnoPaginatedResponse<AgnoType>,
  query: PaginatedQueryDto,
  mapper: (items: AgnoType[]) => DtoType[],
): PaginationDto<DtoType[]> => {
  const mappedData = mapper(agnoResponse.data);
  return new PaginationDto(
    mappedData,
    query,
    agnoResponse.meta.total_items_count,
  );
};
