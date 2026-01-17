import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { Optional } from 'class-validator-extended';
import { PipelineStage } from 'mongoose';

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class PaginatedQueryDto {
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsNumber()
  @Min(1)
  pageSize: number = 10;

  @IsString()
  @Optional()
  sortBy?: string;

  @IsEnum(SortDirection)
  sortDirection: SortDirection = SortDirection.DESC;

  @IsBoolean()
  @Transform(({ obj, key }) => obj[key] === 'true')
  disablePagination: boolean = false;

  get skip(): number {
    return this.disablePagination ? 0 : (this.page - 1) * this.pageSize;
  }

  get limit() {
    return this.disablePagination ? 0 : this.pageSize;
  }

  private get toMongoDbSortDirection() {
    return this.sortDirection === SortDirection.ASC ? 1 : -1;
  }

  get toMongoDbSort(): PipelineStage.Sort {
    return {
      $sort: this.sortBy
        ? { [this.sortBy]: this.toMongoDbSortDirection }
        : { _id: this.toMongoDbSortDirection },
    };
  }

  get toMongoDbFacet(): PipelineStage.Facet {
    return {
      $facet: {
        items: [{ $skip: this.skip }, { $limit: this.pageSize }],
        total: [{ $count: 'total' }],
      },
    };
  }
}
