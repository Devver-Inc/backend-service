import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { Optional } from 'class-validator-extended';

export class CreateInvitationDto {
  @IsEmail()
  @IsNotEmpty()
  invitee: string;

  @Optional()
  @IsNumber()
  @Min(1)
  expiresInHours?: number = 72;

  @Optional()
  @IsString()
  message?: string;

  @Optional()
  @IsArray()
  @IsString({ each: true })
  organizationRoleIds?: string[];
}
