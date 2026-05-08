import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MachineConfigurationResponseDto } from './machine-configuration-response.dto';
import { MongoConfigurationResponseDto } from './mongo-configuration-response.dto';
import { OverlayAccessControlResponseDto } from './overlay-access-control-response.dto';
import { GetUserLightDto } from 'src/users/_utils/dto/responses/get-user-light.dto';

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

  @ApiProperty({ type: () => OverlayAccessControlResponseDto })
  overlayAccessControl: OverlayAccessControlResponseDto;

  @ApiPropertyOptional({
    type: () => MongoConfigurationResponseDto,
    nullable: true,
  })
  mongoConfiguration?: MongoConfigurationResponseDto | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}
