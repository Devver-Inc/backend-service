import { IsBoolean } from 'class-validator';
import { Optional } from 'class-validator-extended';

export class AccessControlDto {
  @Optional()
  @IsBoolean()
  requireEmailAuth?: boolean;

  @Optional()
  @IsBoolean()
  publicAccess?: boolean;

  @Optional()
  @IsBoolean()
  restrictToTeamMembers?: boolean;
}
