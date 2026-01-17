import { Injectable } from '@nestjs/common';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { UsersMapper } from 'src/users/user.mapper';
import {
  GetProjectDto,
  GetProjectLightDto,
} from './_utils/dto/responses/get-project.dto';
import { ProjectDocument } from './project.schema';

@Injectable()
export class ProjectsMapper {
  constructor(private readonly usersMapper: UsersMapper) {}

  toProjectLightDto = (project: ProjectDocument): GetProjectLightDto => ({
    id: project._id.toString(),
    name: project.name,
    description: project.description ?? null,
    createdAt: project.createdAt,
  });

  toProjectLightDtoFromArray = (
    projects: ProjectDocument[],
  ): GetProjectLightDto[] => projects.map(this.toProjectLightDto);

  toProjectDto = (
    project: ProjectDocument,
    createdByUser: LogtoUser | null,
    teamMembers: LogtoUser[],
  ): GetProjectDto => ({
    id: project._id.toString(),
    name: project.name,
    description: project.description ?? null,
    organizationId: project.organizationId,
    createdBy: createdByUser
      ? this.usersMapper.toUserLightDto(createdByUser)
      : null,
    machineConfiguration: {
      cpuCores: project.machineConfiguration.cpuCores,
      ram: project.machineConfiguration.ram,
      storage: project.machineConfiguration.storage,
    },
    teamMembers: this.usersMapper.toUserLightDtoFromArray(teamMembers),
    accessControl: {
      requireEmailAuth: project.accessControl.requireEmailAuth,
      publicAccess: project.accessControl.publicAccess,
      restrictToTeamMembers: project.accessControl.restrictToTeamMembers,
    },
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}
