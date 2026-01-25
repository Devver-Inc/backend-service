import { GetUserLightDto } from 'src/users/_utils/dto/responses/get-user-light.dto';

export class MachineConfigurationResponseDto {
  cpuCores: number;
  ram: number;
  storage: number;
}

export class AccessControlResponseDto {
  requireEmailAuth: boolean;
  publicAccess: boolean;
  restrictToTeamMembers: boolean;
}

export class GetProjectLightDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

export class GetProjectDto {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdBy: GetUserLightDto | null;
  machineConfiguration: MachineConfigurationResponseDto;
  teamMembers: GetUserLightDto[];
  accessControl: AccessControlResponseDto;
  createdAt: Date;
  updatedAt: Date;
}
