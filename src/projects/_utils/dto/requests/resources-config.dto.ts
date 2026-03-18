import { Type } from 'class-transformer';
import { IsString, Matches, ValidateNested } from 'class-validator';
import { Optional } from 'class-validator-extended';

export class ResourceSpecDto {
  @IsString()
  @Matches(/^\d+(Mi|Gi|Ki|m)?$/, {
    message: 'Invalid memory format. Use format like "128Mi", "1Gi", etc.',
  })
  memory: string;

  @IsString()
  @Matches(/^\d+(m)?$/, {
    message: 'Invalid CPU format. Use format like "100m", "1", etc.',
  })
  cpu: string;
}

export class ResourcesConfigDto {
  @Optional()
  @ValidateNested()
  @Type(() => ResourceSpecDto)
  requests?: ResourceSpecDto;

  @Optional()
  @ValidateNested()
  @Type(() => ResourceSpecDto)
  limits?: ResourceSpecDto;
}
