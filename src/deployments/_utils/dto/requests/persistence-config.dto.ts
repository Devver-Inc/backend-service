import { IsBoolean, IsString, Matches } from 'class-validator';
import { Optional } from 'class-validator-extended';

export class PersistenceConfigDto {
  @IsBoolean()
  enabled: boolean;

  @Optional()
  @IsString()
  @Matches(/^\d+(Gi|Mi|Ti)?$/, {
    message: 'Invalid size format. Use format like "10Gi", "100Mi", etc.',
  })
  size?: string;

  @Optional()
  @IsString()
  mountPath?: string;
}
