import { Type } from 'class-transformer';
import { IsBoolean, IsString, Matches, ValidateNested } from 'class-validator';
import { Optional } from 'class-validator-extended';

export class PersistenceVolumeDto {
  @IsString()
  @Matches(/^\d+(Gi|Mi|Ti)?$/, {
    message: 'Invalid size format. Use format like "10Gi", "100Mi", etc.',
  })
  size: string;

  @IsString()
  mountPath: string;

  @IsString()
  storageClass: string;
}

export class PersistenceConfigDto {
  @Optional()
  @IsBoolean()
  enabled?: boolean;

  @Optional()
  @ValidateNested()
  @Type(() => PersistenceVolumeDto)
  app?: PersistenceVolumeDto;

  @Optional()
  @ValidateNested()
  @Type(() => PersistenceVolumeDto)
  root?: PersistenceVolumeDto;
}
