import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Optional } from 'class-validator-extended';
import { ApiQueryDto } from 'src/_utils/dto/request/api-query.dto';
import { RoleEnum } from "src/_utils/enums/role.enum";

export enum UserOrderBy {
  ID = 'id',
  FIRSTNAME = 'firstname',
  LASTNAME = 'lastname',
}

export class UserQueryDto extends ApiQueryDto {
  @ApiProperty({ enum: UserOrderBy })
  @IsEnum(UserOrderBy)
  orderBy: UserOrderBy = UserOrderBy.ID;

  @ApiPropertyOptional({ enum: RoleEnum, description: 'Filter users by role' })
  @Optional()
  @IsEnum(RoleEnum)
  role?: RoleEnum;
}
