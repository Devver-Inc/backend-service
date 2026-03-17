import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GetUserLightDto } from 'src/users/_utils/dto/responses/get-user-light.dto';

export class MachineConfigurationResponseDto {
  @ApiProperty({ example: 4 })
  cpuCores: number;

  @ApiProperty({ example: 8 })
  ram: number;

  @ApiProperty({ example: 100 })
  storage: number;
}

export class AccessControlResponseDto {
  @ApiProperty({ example: false })
  requireEmailAuth: boolean;

  @ApiProperty({ example: true })
  publicAccess: boolean;

  @ApiProperty({ example: false })
  restrictToTeamMembers: boolean;
}

export class GetProjectLightDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'my-project' })
  name: string;

  @ApiPropertyOptional({
    example: 'A short project description',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;
}

export class GetProjectDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'my-project' })
  name: string;

  @ApiPropertyOptional({
    example: 'A short project description',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  organizationId: string;

  @ApiPropertyOptional({ type: () => GetUserLightDto, nullable: true })
  createdBy: GetUserLightDto | null;

  @ApiProperty({ type: () => MachineConfigurationResponseDto })
  machineConfiguration: MachineConfigurationResponseDto;

  @ApiProperty({ type: () => GetUserLightDto, isArray: true })
  teamMembers: GetUserLightDto[];

  @ApiProperty({ type: () => AccessControlResponseDto })
  accessControl: AccessControlResponseDto;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
