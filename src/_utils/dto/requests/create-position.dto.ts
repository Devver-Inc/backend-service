import { IsNumber, IsString, IsUrl } from 'class-validator';

export class CreatePositionDto {
  @IsUrl()
  pageUrl: string;

  @IsString()
  anchor: string;

  @IsNumber()
  normX: number;

  @IsNumber()
  normY: number;

  @IsNumber()
  anchorOffsetX: number;

  @IsNumber()
  anchorOffsetY: number;
}
