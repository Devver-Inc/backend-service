import { IsArray, IsEnum, IsInt, IsString, Max, Min } from 'class-validator';
import { Optional } from 'class-validator-extended';

export enum ContainerTypeEnum {
  APP = 'app',
  OS = 'os',
}

export class ContainerConfigDto {
  @IsString()
  image: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsEnum(ContainerTypeEnum)
  type: ContainerTypeEnum;

  @Optional()
  @IsArray()
  @IsString({ each: true })
  command?: string[];

  @Optional()
  @IsArray()
  @IsString({ each: true })
  args?: string[];
}
