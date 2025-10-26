import { IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { Order } from '../../enums/order.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApiQueryDto {
  @ApiPropertyOptional()
  @IsString()
  search: string = '';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsString()
  orderBy: string = 'id';

  @IsEnum(Order)
  order: Order = Order.DESC;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
