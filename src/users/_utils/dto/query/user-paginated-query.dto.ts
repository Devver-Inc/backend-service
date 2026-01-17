import { IsArray, IsEnum, IsString } from 'class-validator';
import { Optional } from 'class-validator-extended';
import { PaginatedQueryDto } from 'src/_utils/pagination/requests/paginated-query.dto';
import { UserRoleEnum } from 'src/logto/_utils/enums/permissions.enum';

export class UsersPaginatedQueryDto extends PaginatedQueryDto {
  @IsArray()
  @IsEnum(UserRoleEnum, { each: true })
  @Optional()
  rolesFilter?: UserRoleEnum[];

  @IsString()
  @Optional()
  search?: string;
}
