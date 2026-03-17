import { IsString, Matches } from 'class-validator';

export class ResourcesConfigDto {
  @IsString()
  @Matches(/^\d+(Mi|Gi|Ki|m)?$/, {
    message: 'Invalid memory format. Use format like "128Mi", "1Gi", etc.',
  })
  requestsMemory: string;

  @IsString()
  @Matches(/^\d+(m)?$/, {
    message: 'Invalid CPU format. Use format like "100m", "1", etc.',
  })
  requestsCpu: string;

  @IsString()
  @Matches(/^\d+(Mi|Gi|Ki|m)?$/, {
    message: 'Invalid memory format. Use format like "128Mi", "1Gi", etc.',
  })
  limitsMemory: string;

  @IsString()
  @Matches(/^\d+(m)?$/, {
    message: 'Invalid CPU format. Use format like "100m", "1", etc.',
  })
  limitsCpu: string;
}
